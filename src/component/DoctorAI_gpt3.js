
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
#How many times did patient id_1 visit the ICU?
MATCH (p:Patient)-[:HAS_STAY]->(v:PatientUnitStay) WHERE p.patient_id =~ '(?i)id_1' RETURN COUNT(v)

#When did patient id_1 visit the ICU?
MATCH (p:Patient)-[:HAS_STAY]->(v:PatientUnitStay) WHERE p.patient_id =~ '(?i)id_1' RETURN v.hospitaldischargeyear

#What was the diagnosis of patient id_1's visit?; Why did patient id_1 visit the ICU?; What was the cause for patient id_1's visit?
MATCH (p:Patient)-[:HAS_STAY]->()-[:HAS_DIAG]->()-[:IS_DISEASE]->(d:Disease) WHERE p.patient_id =~ '(?i)id_1' RETURN d.name

#Which drug treats COVID-19?; Which kind of compound treats COVID-19?
MATCH (c:Compound)-[:treats]->(d:Disease) WHERE d.name =~ '(?i)COVID-19' RETURN c.name

#Which pathogen causes COVID-19?; What is the disease agent for COVID-19?; Which organism causes COVID-19?
MATCH (o:Pathogen)-[:causes]->(d:Disease) WHERE d.name =~ '(?i)COVID-19' RETURN o.name

#Which gene causes Christianson syndrome?
MATCH (g:Gene)-[r1:associates]->(d:Disease) WHERE d.name =~ '(?i)Christianson syndrome' RETURN g.name

#Tell me something about the disease named "Christianson syndrome"
MATCH (d:Disease) WHERE d.name =~ '(?i)Christianson syndrome' RETURN d.description

#I have Dyspepsia, Hiccup and Edema. What can be the cause of this?
MATCH (s1:Symptom) <-[:presents]- (d:Disease) WHERE s1.name =~ '(?i)Dyspepsia'  MATCH (s2:Symptom) <-[:presents]- (d:Disease) WHERE s2.name =~ '(?i)Hiccup'  MATCH (s3:Symptom) <-[:presents]- (d:Disease) WHERE s3.name =~ '(?i)Edema' RETURN d.name

#what kinds of side effects do Doxepin have?
MATCH (d:Compound)-[:causes]->(s:\`Side Effect\`) WHERE d.name =~ '(?i)Doxepin' RETURN s.name

#what functions does the gene PCBD1 have?
MATCH (g:Gene)-[:participates]->(f:\`Molecular Function\`) WHERE g.name =~ '(?i)PCBD1' RETURN f.name

#which kinds of cancers can be found in frontal sinus?; Which tumors can you find in frontal sinus?
MATCH (d:Disease)-[:localizes]->(a:Anatomy) WHERE a.name =~ '(?i)frontal sinus' AND (d.name CONTAINS "cancer" OR d.disease_category = "Cancer") RETURN DISTINCT(d.name)

#ELI5 what is lung cancer; Explain lung cancer in simple terms; Explain lung cancer in plain English
ELI5 MATCH (d:Disease) WHERE d.name =~ '(?i)lung cancer' RETURN d.description

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

          const response = await openai.createCompletion("text-davinci-002", {
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

          var console_panel = document.getElementById("cypher");
          console_panel.innerText = cypher;

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
