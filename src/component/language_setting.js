

function language_parameters(language) {
    var parameters = {"German": {'lang': 'de-DE', 'voice': 'Anna', 'target_language': 'German', 'fallback_utterance': 'Entschuldigung. Wie bitte?', 'look_utterance': 'Schauen Sie bitte', 'greeting': 'Herzlich willkommen, was kann ich für Sie tun?'},
        "Chinese": {'lang': 'zh-CN', 'voice': 'Ting-Ting', 'target_language': 'Chinese', 'fallback_utterance': '抱歉,可以再说一遍吗?', 'look_utterance': '详情如下', 'greeting': '欢迎,我可以为你做些什么呢?'},
        "English": {'lang': 'en_US', 'voice': 'Samantha', 'target_language': 'English', 'fallback_utterance': 'Sorry, could you please say it again', 'look_utterance': 'Please read the information below', 'greeting': 'Hello, how can I help?'},
        "Japanese": {'lang': 'ja-JP', 'voice': 'Kyoko', 'target_language': 'Japanese', 'fallback_utterance': 'すみませんが,もう一度お願いします', 'look_utterance': 'ご覧ください', 'greeting': 'いらっしゃいませ'}};
        
        if (language in parameters) {
            return parameters[language];
        }
        else {
            return parameters["German"];
        }

    
}


export default language_parameters;