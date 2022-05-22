
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Loading } from 'react-simple-chatbot';
import callTranslate from './translate_de_to_en';
import eli5 from './eli5';
import language_parameters from './language_setting';

import Speech from 'speak-tts'

const speech = new Speech()
require('dotenv').config()


const { Configuration, OpenAIApi } = require("openai");
const neo4j = require('neo4j-driver')

const driver = neo4j.driver(process.env.REACT_APP_NEO4JURI, neo4j.auth.basic(process.env.REACT_APP_NEO4JUSER, process.env.REACT_APP_NEO4JPASSWORD))
const target_language = process.env.REACT_APP_LANGUAGE



//const target_language = "Chinese"


//const target_language = "Japanese"
const lang_p = language_parameters(target_language)

const session = driver.session()

const configuration = new Configuration({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

speech.init({
  'volume': 1,
  //'lang': 'en-GB',
  //'lang': 'de-DE',
  'lang': lang_p['lang'],
  'rate': 1,
  'pitch': 1,
  'voice': lang_p['voice'],
  'splitSentences': true,
  'listeners': {
    'onvoiceschanged': (voices) => {
      console.log("Event voices changed", voices)
    }
  }
})

class DoctorAI extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      result: ''
    };

    this.triggetNext = this.triggetNext.bind(this);
  }

  callDoctorAI() {

    const self = this;
    const { steps } = this.props;
    const search_raw = steps.user.value.trim();

    async function callAsync() {
      let training = `
#Which organism can degrade cellulose?
MATCH (g:Genome) -[:HAS_CAZY]-> (c:Cazy) -[:DEGRADES]->(n:Substrate {substrate: "cellulose"}) RETURN g.name LIMIT 10;

#Which organism can binds cellulose?
MATCH (g:Genome) -[:HAS_CAZY]-> (c:Cazy) -[:BINDS]->(n:Substrate {substrate: "cellulose"}) RETURN g.name LIMIT 10;

#Which organism has Cazy GH16?
MATCH (g:Genome) -[:HAS_CAZY]->(c:Cazy {name:"GH16"}) RETURN g LIMIT 10;

#Which organism has Cazy GT2?
MATCH (g:Genome) -[:HAS_CAZY]->(c:Cazy {name:"GT2"}) RETURN g LIMIT 10;

#Which organisms are under the genus Salinibacter?
MATCH (t:Taxon {rank: "genus", name: "Polaribacter"})-[:HAS_TAXON|:HAS_GENOME]->(t1) RETURN t1.name LIMIT 10;

#Which organisms are under the family Flavobacteriaceae?
MATCH (t:Taxon {rank: "family", name: "Flavobacteriaceae"})-[:HAS_TAXON|:HAS_GENOME]->(t1) RETURN t1.name LIMIT 10;

#Which Cazy binds cellulose?
MATCH (c:Cazy)-[:BINDS]->(n:Substrate {substrate: "cellulose"}) RETURN c.name LIMIT 10;

#Which Cazy binds xylans?
MATCH (c:Cazy)-[:BINDS]->(n:Substrate {substrate: "xylans"}) RETURN c.name LIMIT 10;

#Which Cazy degrades cellulose?
MATCH (c:Cazy)-[:DEGRADES]->(n:Substrate {substrate: "cellulose"}) RETURN c.name LIMIT 10;

#Which Cazy degrades chitin?
MATCH (c:Cazy)-[:DEGRADES]->(n:Substrate {substrate: "chitin"}) RETURN c.name LIMIT 10;

#`;
      let search = search_raw;

      if (lang_p['target_language'] !== "English")
      {
        search = await callTranslate("Translate this " + lang_p['target_language'] + " into English\n\n" + search_raw);
      }
      

      //let search = "Tell me something about the disease called COVID-19?";

      let query = training + search.trim() + "\n"

      let textToSpeak = ''
      try {
        let use_ELI5 = false;
        console.log("query", query)
        if (search) {

          const response = await openai.createCompletion("text-curie-001", {
            prompt: query,
            temperature: 0,
            max_tokens: 300,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
            stop: ["#", ";"],
          });

          console.log('response:', response);
          let original_response = response.data.choices[0].text;
          let cypher = "";
          if (original_response.startsWith("ELI5 "))
          {
            cypher = original_response.substring(5);
            use_ELI5 = true;
          }
          else
          {
            cypher = original_response;
          }
          console.log('Doctor AI:' + cypher);

          //var console_panel = document.getElementById("cypher");
          //console_panel.innerText = cypher;

          try {
            const result = await session.run(cypher)

            //const singleRecord = result.records[0]

            const records = result.records

            records.forEach(element => {
              textToSpeak += element.get(0) + ", "
            });

            //textToSpeak = singleRecord.get(0)
            textToSpeak = textToSpeak.slice(0, -2).trim()
            //console.log("before translation " + "Translate this into " + lang_p['target_language'] + "\n\n" + textToSpeak)
            if (lang_p['target_language'] !== "English")
            {
              textToSpeak = await callTranslate("Translate this into " + lang_p['target_language'] + "\n\n" + textToSpeak);
            }
            console.log("after translation " + textToSpeak)
            
            textToSpeak = textToSpeak.trim()
            if (use_ELI5 === true)
            {
              textToSpeak = await eli5("Summarize this for a second-grade student:\n\n", textToSpeak)
            }
            console.log("after eli5 " + textToSpeak)

          } finally {
            //await session.close()
          }

          // on application exit:
          //await driver.close()
        }
      }
      catch (error) {
        //console.log(process.env);
        console.error(error)
        console.log('Doctor AI:' + textToSpeak);
        //textToSpeak = "Sorry I can't answer that. Could you please try again?"
        textToSpeak = lang_p['fallback_utterance']
      }



      self.setState({ loading: false, result: textToSpeak });

      if (textToSpeak.length > 115) {
        //speech.speak({ text: "Please find the information below" })
        speech.speak({ text: lang_p['look_utterance'] })
          .then(() => { console.log("Success !") })
          .catch(e => { console.error("An error occurred :", e) })
      } else {
        speech.speak({ text: textToSpeak })
          .then(() => { console.log("Success: " + textToSpeak) })
          .catch(e => { console.error("An error occurred :", e) })
      }

    }
    callAsync();
  }

  triggetNext() {
    this.setState({}, () => {
      this.props.triggerNextStep();
    });
  }

  componentDidMount() {
    this.callDoctorAI();
    this.triggetNext();
  }

  render() {
    const { loading, result } = this.state;
    const lines = result.split("\n");
    const elements = [];
    for (const [index, value] of lines.entries()) {
      elements.push(<span key={index}>{value}<br /></span>)
    }

    return (
      <div className="bot-response">
        {loading ? <Loading /> : elements}
      </div>
    );
  }
}

DoctorAI.propTypes = {
  steps: PropTypes.object,
  triggerNextStep: PropTypes.func,
};

DoctorAI.defaultProps = {
  steps: undefined,
  triggerNextStep: undefined,
};

export default DoctorAI;
