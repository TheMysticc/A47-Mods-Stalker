const request = require('request-promise');

const makeRequest = async (url,options) => {
    return request(url,options)
}

module.exports = async (content, webhookURL) => {
  return new Promise((resolve, reject) => {
    let requestBody
      requestBody = JSON.stringify({
        content: content,
      })
    return makeRequest(webhookURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestBody
    })
    .then(function (res) {
      resolve()
    }).catch(function (err){
        reject(err)
    })
  })
}