// ==UserScript==
// @name        BilibiliExp
// @namespace   BilibiliExp
// @match       *://www.bilibili.com/video/*
// @version     1.0
// @author      Dreace
// @license     GPL-3.0
// @description B 站经验助手，自动投币视频、模拟移动端分享、经验获取统计、升级时间估计
// @grant       GM.xmlHttpRequest
// @grant       unsafeWindow
// @require https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js
// @require https://static.hdslb.com/js/md5.js
// ==/UserScript==
// file:///C:/WorkSpace/JavaScript/BilibiliExp/main.js
(function () {
    'use strict';
    const coinUrl = "https://api.bilibili.com/x/web-interface/nav?build=0&mobi_app=web"
    const addCoinUrl = "https://api.bilibili.com/x/web-interface/coin/add"
    const shareUrl = "https://app.bilibili.com/x/v2/view/share/complete"
    const shareUrlPre = "https://app.bilibili.com/x/v2/view/share/click"
    const rewardUrl = "https://account.bilibili.com/home/reward"
    let totalCoin = 0
    let expToday = 0
    let aid = ""
    let bili_jct = getCookie("bili_jct")
    try {
        aid = unsafeWindow.vd ? unsafeWindow.vd.aid : unsafeWindow.aid
    } catch (error) {
        console.log("aid 获取失败")
        return
    }
    function addCoin() {
        return biliAjax({
            url: addCoinUrl,
            type: 'POST',
            dataType: 'json',
            data: {
                aid: aid,
                multiply: "1",
                select_like: 0,
                cross_domain: true,
                csrf: bili_jct
            },
        })
    }
    if (aid) {
        gmAjax({
            url: rewardUrl,
            methon: 'GET',
        }).then((res) => {
            if (res.code == 0) {
                expToday = 50 - res.data.coins_av
            } else {
                console.log("等级信息获取失败");
                return
            }
        })
        gmAjax({
            url: rewardUrl,
            methon: 'GET',
        }).then((res) => {
            if (res.code == 0) {
                expToday = 50 - res.data.coins_av
                if (!res.data.share_av) {
                    let shareData = {
                        access_key: bili_jct,
                        actionKey: "appkey",
                        aid: aid,
                        appkey: "27eb53fc9058f8c3",
                        build: "8960",
                        device: "phone",
                        epid: "",
                        from: "711",
                        mobi_app: "iphone",
                        platform: "ios",
                        season_id: "",
                        share_channel: "qq",
                        share_trace_id: hex_md5(new Date()),
                        statistics: "%7B%22appId%22%3A1%2C%22version%22%3A%225.50.1%22%2C%22abtest%22%3A%22890%22%2C%22platform%22%3A1%7D",
                        ts: new Date().getTime(),
                    }
                    let signed = get_sign(shareData, "c2ed53a74eeefe3cf99fbd01d8c9c375")
                    GM.xmlHttpRequest({
                        method: "POST",
                        url: shareUrl,
                        data: signed.data + "&sign=" + signed.sign,
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        onload: function (response) {
                            let res = JSON.parse(response.responseText)
                            if (res.code == 0) {
                                GM.xmlHttpRequest({
                                    method: "POST",
                                    url: shareUrlPre,
                                    data: signed.data + "&sign=" + signed.sign,
                                    headers: {
                                        "Content-Type": "application/x-www-form-urlencoded"
                                    },
                                    onload: function (response) {
                                        let res = JSON.parse(response.responseText)
                                        console.log(res.data.toast)
                                    }
                                });
                            }
                        }
                    });

                }
            } else {
                console.log("等级信息获取失败");
            }
        }).then(() => {
            return biliAjax({
                url: coinUrl,
                type: 'GET',
                dataType: 'json',
            })
        }).then((res) => {
            totalCoin = res.data.money
            console.log("当前硬币 " + totalCoin + " 个")
            if (totalCoin < 50) {
                console.log("硬币小于 50,暂不投币")
            } else {
                if (expToday == 0) {
                    console.log("今日已获取全部经验")
                }
                return new Promise(function (resolve, reject) {
                    setTimeout(() => {
                        resolve()
                    }, 10000);
                })
            }
        }).then(() => {
            if (totalCoin >= 50 && expToday > 0) {
                console.log("准备投币")
                return addCoin()
            }
        }).then((res) => {
            if (res && res.code == 0) {
                console.log("投了一个币")
                expToday -= 10
                if (expToday > 0) {
                    return addCoin()
                }
            }
        }).then((res) => {
            if (res && res.code == 0) {
                console.log("又投了一个币")
            }
            return gmAjax({
                url: rewardUrl,
                methon: 'GET',
            })
        }).then((res) => {
            if (res.code == 0) {
                let rewardInfo = res.data
                let link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = "//at.alicdn.com/t/font_1537779_4srood2g1uk.css";
                document.body.appendChild(link);
                let style = "color: inherit;display: inline-block;line-height: 1;"
                let spansData = []
                let total = 0
                total += rewardInfo.login ? 5 : 0
                spansData.push({
                    ok: rewardInfo.login,
                    name: "每日登录",
                    text: `${rewardInfo.login ? 5 : 0}/5`,
                    className: "icon-login"
                })
                total += rewardInfo.share_av ? 5 : 0
                spansData.push({
                    ok: rewardInfo.share_av,
                    name: "分享视频",
                    text: `${rewardInfo.share_av ? 5 : 0}/5`,
                    className: "icon-share"
                })
                total += rewardInfo.watch_av ? 5 : 0
                spansData.push({
                    ok: rewardInfo.watch_av,
                    name: "观看视频",
                    text: `${rewardInfo.watch_av ? 5 : 0}/5`,
                    className: "icon-play"
                })
                total += rewardInfo.coins_av
                spansData.push({
                    ok: rewardInfo.coins_av == 50,
                    name: "视频投币",
                    text: `${rewardInfo.coins_av}/50`,
                    className: "icon-coin"
                })
                spansData.push({
                    ok: total == 65,
                    name: "总计",
                    text: `${total}/65`,
                    className: "icon-total"
                })
                spansData.push({
                    ok: false,
                    name: `最快到 ${rewardInfo.level_info.current_level + 1} 级剩余天数`,
                    text: `${Math.ceil((rewardInfo.level_info.next_exp - rewardInfo.level_info.current_exp) / 65)} 天`,
                    className: "icon-day"
                })
                let bar = document.getElementById("arc_toolbar_report")
                bar.style.height = "60px"
                let ops = document.createElement('div')
                ops.className = "ops"

                spansData.forEach((item) => {
                    let span = document.createElement("span")
                    if (item.ok) {
                        span.style = "color:rgb(251, 114, 153);"
                    } else {
                        span.style = "color:rgb(80, 80, 80);"
                    }
                    span.title = item.name
                    span.innerHTML = `<i class="${item.className} iconfont" style="${style}"></i>${item.text}`
                    ops.appendChild(span.cloneNode(true))
                })
                ops.style.marginTop = "10px"
                bar.appendChild(ops)
            }
        })
    }
})();
function gmAjax(opt) {
    return new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
            method: opt.methon,
            url: opt.url,
            data: opt.data ? opt.data : "",
            headers: opt.headers ? opt.headers : "",
            onload: function (response) {
                let res = JSON.parse(response.responseText)
                resolve(res)
            },
            onError: function (error) {
                reject(error)
            }
        });
    })
}
function request(opt) {
    return $.ajax(opt)
}
function createPromise() {
    return $.Deferred()
}
function biliAjax(opt) {
    let req
    opt.xhrFields = {
        withCredentials: true
    }
    opt.crossDomain = true
    let defer = createPromise()
    req = request(opt)
    req.done(function (d) {
        defer.resolve(d)
    })
    req.fail(d => {
        defer.reject(d)
    })

    return defer
}
function get_sign(params, key) {
    var s_keys = []
    for (var i in params) {
        s_keys.push(i)
    }
    s_keys.sort()
    var data = ""
    for (var i = 0; i < s_keys.length; i++) {
        data += (data ? "&" : "") + s_keys[i] + "=" + params[s_keys[i]]
    }
    return { sign: hex_md5(data + key), data: data }
}
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}