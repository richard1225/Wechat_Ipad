'use strict'
const rp = require('request-promise')

const axios = require('axios')
const WEIXIN_ES = 'http://10.194.165.27:8200/weixin_seeds/biz/_search?q=is_update:false&sort=insert_time:desc'

let MEMBER_DICT = {} // username : biz
const GROUP_ID = '5742644350@chatroom'
const del_time = 15000

async function scheduler() {
    // 获取群成员的wxid
    const roommember = await wx.getRoomMembers(GROUP_ID)
    let gmembers = roommember.data.member

    // 初始化接受者的biz字典，全部value都是'a'
    for (let men of gmembers) {
        MEMBER_DICT[men.userName] = 'a'
    }

    while (true) {
        for (let wxid in MEMBER_DICT) {
            if (!is_exist('./biz/' + MEMBER_DICT[wxid])) {
                // 若该接受者已经消费了biz
                let biz = await update(wxid)
                // 接受者更新当前hold住的biz
                MEMBER_DICT[wxid] = biz
                // 等待es更新完毕
                await sleep(1000)
            }
        }
        await sleep(4000)
    }
}

async function update(wxid) {
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

        // 构造更新es的data
        let action_str = '{"index":{"_index":"weixin_seeds","_type":"biz","_id":"' + biz + '" }}'

        let es_str = action_str + "\n" + JSON.stringify(data) + "\n"

        // 更新biz的is_update 字段
        var options = {
            method: 'POST',
            uri: 'http://10.194.165.27:8200/_bulk',
            body: es_str
        }
        await rp(options)

        await wx.sendMsg(wxid, url)

        // 创建biz 文件
        fs.closeSync(fs.openSync('./biz/' + biz, 'w'));
        // del_time 毫秒后删除biz文件
        setTimeout(() => { fs.unlink('./biz/' + biz) }, del_time)
        return biz

    } catch (error) {
        console.log(error)
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function is_exist(path) {
    return fs.existsSync(path)
}
