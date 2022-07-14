const request = require('request-promise');
const httpOpt = {
    method: 'GET',
    resolveWithFullResponse: true
}
/*
-- Sample Thumbnail Request Data --
{
    "requestId": "undefined:undefined:AvatarHeadshot:150x150:null:regular",
    "type": "AvatarHeadShot",
    "token": "114BD280A3BB641DF9B5C1BE862CB0C8",
    "format": null,
    "size": "150x150"
}
*/

const getAvatarThumbnail = require('./avatarThumbnail')

const makeRequest = async (url,options) => {
    return request(url,options)
}

async function isPlayerOnline(userId){
    let requestBody = {
        "userIds": []
    }
    requestBody.userIds.push(Number(userId))
    const userPresence = await request({
        method: 'POST',
        uri: 'https://presence.roblox.com/v1/presence/users',
        body: requestBody,
        json: true
    }).then(response => {
        if(response.userPresences){
            if(response.userPresences[0]){
                if(response.userPresences[0].userPresenceType === 2){
                    return true
                } else {
                    return false
                }
            } else {
                return false
            }
        } else {
            return false
        }
    })
    .catch(err => {
        console.log("Presence Error ", err)
    })
    return userPresence
}

module.exports = async (gameId, targetPlayer) => {
    let requestData = []
    const targetAvatarURL = await getAvatarThumbnail(targetPlayer, true).catch(err => {
        console.log("Thumbnails GET Error ", err)
    })
    const gameInstances = await makeRequest(`https://games.roblox.com/v1/games/${String(gameId)}/servers/Public?limit=100`, httpOpt).then(response => {
        return response.body
    }).catch(err => {
        console.log("Games Server GET Error ", err)
    })
    const isOnline = await isPlayerOnline(targetPlayer)
    if(!isOnline) return {match: false, multipleMatches: false}
    const placeServers = JSON.parse(gameInstances)
    for(let server of placeServers.data){
        for(let playerToken of server.playerTokens){
            requestData.push({
                "requestId": "undefined:undefined:AvatarHeadshot:150x150:null:regular",
                "type": "AvatarHeadShot",
                "token": playerToken,
                "format": null,
                "size": "150x150"
            })
        }
    }
    if(requestData.length <= 0) return {match: false, multipleMatches: false}
    const foundThumbnails = []
    //-- Getting Active Players Thumbnails from Tokens
    const thumbnails = await request({
        method: 'POST',
        uri: 'https://thumbnails.roblox.com/v1/batch',
        body: requestData,
        json: true
    }).then(response => {
        for(let data of response.data){
            if(data.state === "Completed"){
                foundThumbnails.push(data.imageUrl)
            }
        }
    })
    .catch(err => {
        console.log("Thumbnails Error ", err)
    })
    //-- Matching to the target.
    let matches = 0
    for(let playerThumbnail of foundThumbnails){
        if(playerThumbnail === targetAvatarURL){
            matches++
        }
    }
    if(matches > 0){
        return {match: true, multipleMatches: matches > 1 ? true : false}
    } else {
        return {match: false, multipleMatches: false}
    }
}