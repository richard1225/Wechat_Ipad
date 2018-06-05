'use strict'
const rp = require('request-promise')
const axios = require('axios')
const WEIXIN_ES = 'http://10.194.165.27:8200/weixin_seeds/biz/_search?q=is_update:false&sort=insert_time:desc'
var LAST_BIZ = ''

async function haha() {
    for (let i = 0; i < 5; i++) {
        let biz = await update()
        if (biz == LAST_BIZ) {
            await sleep(1000)
            i -= 1
        }
        else {
            LAST_BIZ = biz
            console.log(biz)
        }
    }
}

async function update() {
    try {
        // 获取biz 和 列表页信息
        let biz = ''
        let url = ''
        let data = ''
        await axios.get(WEIXIN_ES)
            .then(function (response) {
                data = response.data
                biz = data.hits.hits[0]._id
                url = data.hits.hits[0]._source.ori_url
                data = data.hits.hits[0]._source
                data.is_update = true
                // console.log(biz, url)
            })

        let action_str = '{"index":{"_index":"weixin_seeds","_type":"biz","_id":"' + biz + '" }}'

        let es_str = action_str + "\n" + JSON.stringify(data) + "\n"

        // 更新biz
        var options = {
            method: 'POST',
            uri: 'http://10.194.165.27:8200/_bulk',
            body: es_str
        }

        await rp(options)
        return biz
        console.log(3)
    } catch (error) {
        console.log(error)
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
haha()