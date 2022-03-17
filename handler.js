const Archiver = require("archiver");
const AWS = require("aws-sdk");
const { Stream } = require("stream");
const path = require("path");

// Bring in AWS S3 funtionality
const s3 = new AWS.S3({ region: "us-west-2" });

const ARCHIVE_CONTENT_TYPE = "application/zip";

/**
 * Handles Lambda responses
 */
class ResponseHandler {
  /**
   * Success response
   * @param {String} message return message
   * @param {Object} context lambda context
   * @returns {{statusCode: Number, body: String, headers: Object}}
   */
  static successResponse(message, context) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message,
        request_id: context.awsRequestId,
      }),
      headers: { "Access-Control-Allow-Origin": "*" },
    };
  }

  /**
   * Error response
   * @param {Error} error
   * @param {Object} context lambda context
   * @returns {{statusCode: Number, body: String, headers: Object}}
   */
  static errorResponse(error, context) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message,
        request_id: context.awsRequestId,
      }),
      headers: { "Access-Control-Allow-Origin": "*" },
    };
  }
}

/**
 * Zip handler and AWS S3 stream/upload handler
 */
class ZipHandler {
  /**
   * Creates a new Zip handler object to compress files into a zip folder to be re-uploaded to AWS
   * @param {String} key the AWS S3 resource key
   * @param {String} bucket the AWS S3 bucket name
   * @param {Object} context the lambda context
   * @param {String} archiveFilePath the new resource zip file id
   * @param {String} archiveFolderPath The path to the zip resource in AWS S3. e.g '/zip/files/{{key}}'. defaults to ''
   * @param {String} archiveFormat The zip archive type. defaults to 'zip'
   */
  constructor(
    key,
    bucket,
    context,
    archiveFilePath,
    archiveFolderPath = "",
    archiveFormat = "zip"
  ) {
    this.key = key;
    this.bucket = bucket;
    this.context = context;
    this.archiveFilePath = archiveFilePath;
    this.archiveFolderPath = archiveFolderPath;
    this.archiveFormat = archiveFormat;
  }

  /**
   * Gets the AWS S3 download streams for the resource
   * @returns {{stream: internal.Readable, filename: String}}
   */
  s3DownloadStream() {
    return {
      stream: this._readStream(),
      filename: `${this.archiveFolderPath}/${this.key}`,
    };
  }

  /**
   * Process the S3 file by converting it to a zip file and re-uploading to AWS S3
   * @returns {Promise<{statusCode: Number, body: String, headers: Object}>}
   */
  async process() {
    const { s3StreamUpload, uploaded } = this._writeStream();
    const s3DownloadStream = this.s3DownloadStream();

    await new Promise((resolve, reject) => {
      const archive = Archiver(this.archiveFormat);
      archive.on("error", (error) => {
        console.log(error);
        return ResponseHandler.errorResponse(error, this.context);
      });
      console.log("starting upload");
      s3StreamUpload.on("close", resolve);
      s3StreamUpload.on("end", resolve);
      s3StreamUpload.on("error", reject);
      archive.pipe(s3StreamUpload);
      archive.append(s3DownloadStream.stream, {
        name: s3DownloadStream.filename,
      });
      archive.finalize();
    }).catch((error) => {
      console.log(error);
      return ResponseHandler.errorResponse(error, this.context);
    });
    await uploaded.promise().catch((error) => {
      console.log(error);
      return ResponseHandler.errorResponse(error, this.context);
    });
    console.log("done");
    return ResponseHandler.successResponse("uploaded", this.context);
  }

  /**
   * @private
   * Gets the AWS S3 read stream from the object being processed
   * @returns {internal.Readable}
   */
  _readStream() {
    return s3
      .getObject({ Bucket: this.bucket, Key: this.key })
      .createReadStream();
  }

  /**
   * @private
   * Gets the AWS S3 write stream and upload for the the object being processed
   * @returns {{s3StreamUpload: internal.PassThrough, uploaded: AWS.S3.ManagedUpload}}
   */
  _writeStream() {
    const streamPassThrough = new Stream.PassThrough();
    const params = {
      ACL: "private", //options are -> `private`, `public-read`, `public-read-write`, `authenticated-read`, `aws-exec-read`, `bucket-owner-read`, `bucket-owner-full-control`
      Body: streamPassThrough,
      Bucket: this.bucket,
      ContentType: ARCHIVE_CONTENT_TYPE,
      Key: this.archiveFilePath,
    };
    return {
      s3StreamUpload: streamPassThrough,
      uploaded: s3.upload(params, (err) => console.log(err)),
    };
  }
}

/**
 * AWS Lambda Handler
 * @param {Object} event the lambda event
 * @param {Object} context the lambda context
 */
exports.handler = async function (event, context) {
  const key = event.Records[0].s3.object.key;
  const bucket = event.Records[0].s3.bucket.name;
  const archiveFilePath = `zip/${path.parse(key).name}.zip`;
  console.log(key, bucket, archiveFilePath);
  const zipHandler = new ZipHandler(key, bucket, context, archiveFilePath);
  return await zipHandler.process();
};
