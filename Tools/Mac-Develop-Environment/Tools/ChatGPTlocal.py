# Copyright © 2024 Carson. All rights reserved.

import openai
import time
import speech_recognition as sr
from gtts import gTTS
import os

openai.api_key = "YOUR_API_KEY_HERE"

def generate_response(prompt):
    model_engine = "davinci"
    prompt_text = prompt
    max_tokens = 60
    temperature = 0.7
    n = 1
    stop = None

    response = openai.Completion.create(
        engine=model_engine,
        prompt=prompt_text,
        max_tokens=max_tokens,
        temperature=temperature,
        n=n,
        stop=stop
    )

    ai_response = response.choices[0].text.strip()

    return ai_response

def main():
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("Say 'Kristy' to start.")
        while True:
            audio = r.listen(source)
            try:
                wake_word = r.recognize_google(audio)
                if wake_word.lower() == "kristy":
                    print("Say something...")
                    break
            except sr.UnknownValueError:
                continue
            except sr.RequestError as e:
                print("Could not request results from Google Speech Recognition service; {0}".format(e))
                continue

        while True:
            audio = r.listen(source)
            try:
                user_input = r.recognize_google(audio)
                print("You said: " + user_input)
            except sr.UnknownValueError:
                continue
            except sr.RequestError as e:
                print("Could not request results from Google Speech Recognition service; {0}".format(e))
                continue

            if user_input.lower() == "exit":
                break

            ai_response = generate_response(user_input)

            print("AI: " + ai_response)

            tts = gTTS(text=ai_response, lang='en')
            tts.save("ai_response.mp3")
            os.system("mpg123 ai_response.mp3")

            time.sleep(0.5)

if __name__ == "__main__":
    main()