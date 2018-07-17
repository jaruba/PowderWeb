// btoa (base64 encode) in pure js

module.exports = (input) => {

    var buffer;

    if (input instanceof Buffer) {
      buffer = input;
    } else {
      buffer = Buffer.from(input.toString(), 'binary');
    }

    return buffer.toString('base64');

};
