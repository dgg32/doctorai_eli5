const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY
});


const openai = new OpenAIApi(configuration);

async function eli5(instruction, raw_text) {
    let query = instruction + raw_text + "\n";

      const response = await openai.createCompletion("text-davinci-002", {
        prompt: query,
        temperature: 0.7,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
    
    console.log("eli5 response", response);
    //finish_reason: "stop"
    //finish_reason: "length"
    var eli5_result = response.data.choices[0].text;
    
    if (response.data.choices[0].finish_reason !== "length") {
        eli5_result += " ...";
    }

    return eli5_result.trim();
}


export default eli5;



