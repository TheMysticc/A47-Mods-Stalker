const request = require('request-promise');

const makeRequest = async (url,options) => {
    return request(url,options)
}

module.exports = async (userId, biggerHeadshot) => {
  return new Promise((resolve, reject) => {
    const httpOpt = {
      method: 'GET',
      resolveWithFullResponse: true
    }
    return makeRequest(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=${biggerHeadshot === true ? "150x150" : "48x48"}&format=Png`,httpOpt)
      .then(function (res) {
        const responseData = JSON.parse(res.body)
        if (res.statusCode !== 200) {
          let error = 'An unknown error has occurred.'
          if (responseData && responseData.errors) {
            error = responseData.errors.map((e) => e.message).join('\n')
          }
          reject(new Error(error))
        } else {
          if(biggerHeadshot) return resolve(responseData.data[0].imageUrl)
          const stringToSplit = String(responseData.data[0].imageUrl)
          const splitOne = stringToSplit.split(`https://tr.rbxcdn.com/`)[1]
          const finalSplit = splitOne.split(`/48/48/AvatarHeadshot/Png`)[0]
          resolve(finalSplit || "c4265017c98559993061733b1125a23c")
        }
      })
      .catch(function (err) {
        reject(err)
      })
  })
}