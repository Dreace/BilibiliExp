// ==UserScript==
// @name        BilibiliExp
// @namespace   BilibiliExp
// @match       *://www.bilibili.com/video/*
// @match       *://link.acg.tv/forum.php*
// @version     1.2.4
// @author      Dreace
// @license     GPL-3.0
// @description B 站经验助手，自动投币视频、模拟移动端分享、经验获取统计、升级时间估计
// @grant       GM.xmlHttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       unsafeWindow
// @require     https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js
// @require     https://cdn.bootcss.com/blueimp-md5/1.1.0/js/md5.min.js
// ==/UserScript==

'use strict';
if (location.href.match('link.acg.tv/forum.php') && location.href.match('access_key') && window.opener) {
    window.stop();
    document.children[0].innerHTML = '<title>BilibiliExp - 获取 Access Key</title><meta charset="UTF-8" name="viewport" content="width=device-width">正在跳转……';
    window.opener.postMessage('get_access_key: ' + location.href, '*');
    return;
}
var coinUrl = "https://api.bilibili.com/x/web-interface/nav?build=0&mobi_app=web";
var addCoinUrl = "https://api.bilibili.com/x/web-interface/coin/add";
var shareUrl = "https://app.bilibili.com/x/v2/view/share/complete";
var shareUrlPre = "https://app.bilibili.com/x/v2/view/share/click";
var rewardUrl = "https://account.bilibili.com/home/reward";
var totalCoin = 0;
var expToday = 0;
var aid = "";
var isLevel6 = false;
var bili_jct = getCookie("bili_jct");
try {
    aid = unsafeWindow.vd ? unsafeWindow.vd.aid : unsafeWindow.aid;
} catch (error) {
    console.error("[BilibiliExp] aid 获取失败");
    return;
}
var access_key = GM_getValue('access_key');
if (access_key) {
    checkKeyStatus(access_key);
} else {
    getKey();
}
if (aid) {
    gmAjax({
        url: rewardUrl,
        method: 'GET'
    }).then(function (res) {
        console.log(res);
        if (res.code == 0) {
            isLevel6 = res.data.level_info.current_level === 6;
            if (isLevel6) {
                console.log("[BilibiliExp] 已达到六级");
                return empty();
            }
            expToday = 50 - res.data.coins_av;
            if (!res.data.share_av && access_key) {
                var shareData = {
                    access_key: access_key.key,
                    actionKey: "appkey",
                    aid: aid,
                    build: "9180",
                    device: "phone",
                    epid: "",
                    from: "711",
                    mobi_app: "iphone",
                    platform: "ios",
                    season_id: "",
                    share_channel: "wechat",
                    share_trace_id: md5(new Date()),
                    statistics: "%7B%22appId%22%3A1%2C%22version%22%3A%225.53.2%22%2C%22abtest%22%3A%22890_507_510%22%2C%22platform%22%3A1%7D"
                };
                var signed = get_sign(shareData, "c2ed53a74eeefe3cf99fbd01d8c9c375");
                gmAjax({
                    method: "POST",
                    url: shareUrlPre,
                    data: signed.data + "&sign=" + signed.sign,
                    headers: { "Content-Type": "application/x-www-form-urlencoded" }
                }).then(function (res) {
                    if (res.code == 0) {
                        return gmAjax({
                            method: "POST",
                            url: shareUrl,
                            data: signed.data + "&sign=" + signed.sign,
                            headers: { "Content-Type": "application/x-www-form-urlencoded" }
                        });
                    }
                }).then(function (res) {
                    console.log("[BilibiliExp] " + res.data.toast);
                });
            }
        } else {
            console.error("[BilibiliExp] 等级信息获取失败");
            reject("等级信息获取失败");
        }
    }).then(function () {
        return biliAjax({
            url: coinUrl,
            type: 'GET',
            dataType: 'json'
        });
    }).then(function (res) {
        totalCoin = res.data.money;
        console.log("[BilibiliExp] 当前硬币 " + totalCoin + " 个");
        if (isLevel6) {
            return wait(5000);
        }
        if (totalCoin < 50) {
            console.log("[BilibiliExp] 硬币小于 50,暂不投币");
        } else {
            if (expToday == 0) {
                console.log("[BilibiliExp] 今日已获取全部经验");
            }
        }
        return wait(5000);
    }).then(function () {
        if (isLevel6) {
            return empty();
        }
        if (totalCoin >= 50 && expToday > 0) {
            console.log("[BilibiliExp] 准备投币");
            return addCoin();
        }
    }).then(function (res) {
        if (isLevel6) {
            return empty();
        }
        if (res && res.code == 0) {
            console.log("[BilibiliExp] 投了一个币");
            expToday -= 10;
            if (expToday > 0) {
                return addCoin();
            }
        }
    }).then(function (res) {
        if (isLevel6) {
            return gmAjax({
                url: rewardUrl,
                method: 'GET'
            });
        }
        if (res && res.code == 0) {
            console.log("[BilibiliExp] 又投了一个币");
        }
        return gmAjax({
            url: rewardUrl,
            method: 'GET'
        });
    }).then(function (res) {
        if (res.code == 0) {
            var rewardInfo = res.data;
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = "//at.alicdn.com/t/font_1537779_4srood2g1uk.css";
            document.body.appendChild(link);
            var style = "color: inherit;display: inline-block;line-height: 1;";
            var spansData = [];
            var total = 0;
            total += rewardInfo.login ? 5 : 0;
            spansData.push({
                ok: rewardInfo.login,
                name: "每日登录",
                text: ((rewardInfo.login ? 5 : 0) + "/5"),
                className: "icon-login"
            });
            total += rewardInfo.share_av ? 5 : 0;
            spansData.push({
                ok: rewardInfo.share_av,
                name: "分享视频",
                text: ((rewardInfo.share_av ? 5 : 0) + "/5"),
                className: "icon-share"
            });
            total += rewardInfo.watch_av ? 5 : 0;
            spansData.push({
                ok: rewardInfo.watch_av,
                name: "观看视频",
                text: ((rewardInfo.watch_av ? 5 : 0) + "/5"),
                className: "icon-play"
            });
            total += rewardInfo.coins_av;
            spansData.push({
                ok: rewardInfo.coins_av == 50,
                name: "视频投币",
                text: (rewardInfo.coins_av + "/50"),
                className: "icon-coin"
            });
            spansData.push({
                ok: total == 65,
                name: "总计",
                text: (total + "/65"),
                className: "icon-total"
            });
            if (isLevel6) {
                spansData.push({
                    ok: true,
                    name: "一个成熟的六级大佬",
                    text: "六级辣",
                    className: "icon-day"
                });
            } else {
                spansData.push({
                    ok: false,
                    name: ("最快到 " + (rewardInfo.level_info.current_level + 1) + " 级剩余天数"),
                    text: (Math.ceil((rewardInfo.level_info.next_exp - rewardInfo.level_info.current_exp) / 65) + " 天"),
                    className: "icon-day"
                });
            }

            var bar = document.getElementById("arc_toolbar_report");
            bar.style.height = "60px";
            var ops = document.createElement('div');
            ops.className = "ops";
            spansData.forEach(function (item) {
                var span = document.createElement("span");
                if (item.ok) {
                    span.style = "color:rgb(251, 114, 153);";
                } else {
                    span.style = "color:rgb(80, 80, 80);";
                }
                span.title = item.name;
                span.innerHTML = ("<i class=\"" + item.className + " iconfont\" style=\"" + style + "\"></i>" + item.text);
                ops.appendChild(span.cloneNode(true));
            });
            ops.style.marginTop = "10px";
            bar.appendChild(ops);
        }
    });
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
        }
    });
}
function gmAjax(opt) {
    return new Promise(function (resolve, reject) {
        GM.xmlHttpRequest({
            method: opt.method,
            url: opt.url,
            data: opt.data ? opt.data : "",
            headers: opt.headers ? opt.headers : "",
            onload: function (response) {
                var res = JSON.parse(response.responseText);
                resolve(res);
            },
            onError: function (error) {
                reject(error);
            }
        });
    });
}
function wait(n){
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, n);
    });
}
function empty() {
    return new Promise(function (resolve, reject) {
        resolve();
    });
}
function request(opt) {
    return $.ajax(opt);
}
function createPromise() {
    return $.Deferred();
}
function biliAjax(opt) {
    var req;
    opt.xhrFields = { withCredentials: true };
    opt.crossDomain = true;
    var defer = createPromise();
    req = request(opt);
    req.done(function (d) {
        defer.resolve(d);
    });
    req.fail(function (d) {
        defer.reject(d);
    });
    return defer;
}
function get_sign(params, key) {
    params.appkey = "27eb53fc9058f8c3";
    params.build = 8960;
    params.ts = Date.now();
    var s_keys = [];
    for (var i in params) {
        s_keys.push(i);
    }
    s_keys.sort();
    var data = "";
    for (var i = 0; i < s_keys.length; i++) {
        data += (data ? "&" : "") + s_keys[i] + "=" + params[s_keys[i]];
    }
    var sign = md5(data + key);
    return {
        sign: sign,
        data: data,
        signedData: data + "&sign=" + sign
    };
}
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) == 0)
            return c.substring(name.length, c.length);
    }
    return "";
}
function checkKeyStatus(access_key) {
    if (Date.now() - access_key.time > 25 * 24 * 3600000) {
        console.log('[BilibiliExp] access_key 即将过期');
        getKey()
    }
}
window.addEventListener('message', function (e) {
    if (typeof e.data == 'string' && e.data.split(':')[0] == "get_access_key") {
        access_key_window.close();
        var url = e.data.split(': ')[1];
        var key = url.match(/access_key=([a-f0-9]{32})/);
        if (key) {
            var access_key = {
                key: key[1],
                time: Date.now()
            };
            GM_setValue('access_key', access_key);
            console.log('[BilibiliExp] 成功获取 access_key: ' + access_key.key);
        }
    }
});
function getKey() {
    var access_key_window = window.open('about:blank');
    access_key_window.document.title = 'BilibiliExp - 获取 Access Key';
    access_key_window.document.body.innerHTML = '<meta charset="UTF-8" name="viewport" content="width=device-width">[BilibiliExp] 正在获取 Access Key';
    window.access_key_window = access_key_window;
    biliAjax({
        url: "https://passport.bilibili.com/login/app/third",
        type: 'GET',
        dataType: 'json',
        data: {
            "appkey": "27eb53fc9058f8c3",
            "api": "http://link.acg.tv/forum.php",
            "sign": "67ec798004373253d60114caaad89a8c"
        }
    }).then(function (res) {
        if (res.data.has_login) {
            access_key_window.document.body.innerHTML = '<meta charset="UTF-8" name="viewport" content="width=device-width">[BilibiliExp] 正在跳转';
            access_key_window.location.href = res.data.confirm_uri;
        } else {
            access_key_window.close();
            console.error('[BilibiliExp] 必须登录 B 站才能获取 access_key');
        }
    });
}