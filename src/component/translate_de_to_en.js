const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY
});


const openai = new OpenAIApi(configuration);

async function callTranslate(instruction, raw_text) {
    let query = instruction + raw_text + "\n";
    const response = await openai.createCompletion("text-davinci-001", {
        prompt: query,
        temperature: 0.3,
        max_tokens: 300,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
    
    console.log("translate response", response);
    //finish_reason: "stop"
    //finish_reason: "length"
    var translate_result = response.data.choices[0].text;
    
    if (response.data.choices[0].finish_reason !== "length") {
      translate_result += " ...";
    }

    return translate_result.trim();
}


export default callTranslate;