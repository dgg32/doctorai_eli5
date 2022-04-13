import './App.css';
import ChatBot from 'react-simple-chatbot';
import { ThemeProvider } from 'styled-components';
import DoctorAI from './component/DoctorAI_gpt3';
import language_parameters from './component/language_setting';
import React, { useEffect, useRef } from "react";
import "./Alan.css";
import alanBtn from "@alan-ai/alan-sdk-web";

const target_language = process.env.REACT_APP_LANGUAGE
const alan_api = process.env.REACT_APP_ALAN_API;
//const target_language = "Chinese"
//const target_language = "Japanese"
//const target_language = "English"
const lang_p = language_parameters(target_language)

const ENABLE_THEME = true

const theme_red = {
  background: '#f5f8fb',
  fontFamily: 'Tahoma',
  headerBgColor: '#DC143C',
  headerFontColor: '#fff',
  headerFontSize: '15px',
  botBubbleColor: '#DC143C',
  botFontColor: '#fff',
  userBubbleColor: '#fff',
  userFontColor: '#4a4a4a',
};

const theme = ENABLE_THEME ? theme_red : ''

const steps = [
  {
    id: 'bot-welcome',
    //message: 'Welcome to Doctor AI, how can I help?',
    message: lang_p["greeting"],
    trigger: 'user'
  },
  {
    id: 'user',
    user: true,
    trigger: 'bot-response'
  },
  {
    id: 'bot-response',
    component: <DoctorAI />,
    waitAction: true,
    asMessage: true,
    trigger: 'user'
  },
  {
    id: 'not-bye',
    message: 'Thank you. Have a great day!',
    end: true
  },
];

function App() {
  const alanBtnContainer = useRef();
  let chatbotObject = null;
  let chatbot = (
    <ChatBot
      steps={steps}
      ref={(node) => (chatbotObject = node)}
      headerTitle="Doctor.ai"
      botAvatar="doctor.ai_trans.png"
      userAvatar="user.png"
      recognitionEnable={true}
      width="750px"
      speechSynthesis={{ enable: false, lang: "en" }}
    />
  );

  useEffect(() => {
    alanBtn({
      key: alan_api,
      //rootEl: alanBtnContainer.current,
      onCommand: (commandData) => {
        //console.log("commandData", commandData);
        // if (commandData.command === 'command-example') {
        //   if (logoEl.current) {
        //       logoEl.current.style.transform = 'rotate(180deg)';
        //   }
        // }
      },
      onEvent: function(e) {
        switch (e.name) {
          case "recognized":
            console.info("Interim results:", e.text);
            break;
          case "parsed":
            console.info("Final result:", e.text);
            chatbotObject.onRecognitionChange(e.text);
            break;
          case "text":
            console.info("Alan reponse:", e.text);

            break;
          default:
            console.info("Unknown event");
        }
      },
    });
  }, [chatbotObject]);

  return (
    <div className="App" style={{ display: "flex", justifyContent: "center" }}>
      {theme !== "" ? (
        <ThemeProvider theme={theme}> {chatbot} </ThemeProvider>
      ) : (
        chatbot
      )}
      <div ref={alanBtnContainer}></div>
    </div>
  );
}

export default App;
