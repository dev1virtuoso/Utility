# Cantonese Hanzi Romanized Input System Typing Yard (C.H.R.I.S.T.Y)

## Overview
C.H.R.I.S.T.Y is a web-based application designed to help users practice typing Cantonese Pinyin (Jyutping) with corresponding traditional Chinese characters. The application randomly displays a Jyutping syllable and its associated Chinese character, allowing users to input the correct Jyutping and receive immediate feedback. The interface features black, white, and yellow theme, ensuring an engaging and user-friendly experience.

## Features
- **Randomized Word Display**: Presents a random Jyutping syllable and its traditional Chinese character for typing practice.
- **Instant Feedback**: Checks user input against the correct Jyutping and provides feedback ("Correct!" or the correct answer if wrong).
- **Score Tracking**: Keeps track of the user's score based on correct answers.
- **External Data Source**: Loads vocabulary from a CSV file derived from the [yyzd](https://github.com/kfcd/yyzd) database.
- **Responsive Design**: Built with Tailwind CSS for a modern, responsive layout compatible with various devices.

## Technologies Used
- **HTML**: Structure of the web application.
- **CSS**: Styling with Tailwind CSS and custom styles for a black, white, and yellow theme.
- **JavaScript**: Handles logic for loading CSV data, displaying words, checking inputs, and updating the score.
- **Data Source**: Uses the [yyzd](https://github.com/kfcd/yyzd) database for Cantonese vocabulary database.

## Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/dev1virtuoso/Utility.git
   cd Utility/Tools/C.H.R.I.S.T.Y.christy
   ```

2. **Prepare the CSV File**:
   - Download or extract the Cantonese vocabulary data from [yyzd](https://github.com/kfcd/yyzd).
   - Rename the [data](https://github.com/kfcd/yyzd/blob/master/dist/csv/繁體/粵語字典_(粵拼).csv) to a `cantonese_words.csv` with the following columns.
   - Example CSV content:
     ```csv
     繁體,簡體,拼音,詞例,定義,又作
     丫,丫,a1,,,
     呀,呀,a1,,,
     啊,啊,a1,啊！好美啊，啊！下雪了，啊！失火了，啊！太精彩了,（歎詞）表示贊歎、驚異、吃驚等語氣,
     ```
   - Place `cantonese_words.csv` in the same directory as the application files.

3. **Serve the Application**:
   - Due to the use of the fetch API to load the CSV file, the application must be served via a local server. You can use following methods:
     - **Node.js** (with `serve`):
       ```
       npm install -g serve
       serve
       ```
   - Open your browser and navigate to `http://localhost:8000` (or the port provided by your server).

4. **File Structure**:
   ```
   C.H.R.I.S.T.Y/
   ├── index.html
   ├── styles.css
   ├── script.js
   ├── cantonese_words.csv
   └── README.md
   ```

## Usage
1. Open the application in a web browser.
2. A random Jyutping syllable and its corresponding traditional Chinese character will be displayed.
3. Type the Jyutping in the input field and press "Enter" or click the "Submit" button.
4. Receive feedback on whether your input is correct. Your score will increase for each correct answer.
5. Continue practicing with new words displayed after each submission.

## Data Source
The vocabulary is sourced from the [yyzd](https://github.com/kfcd/yyzd) database, which provides a comprehensive collection of Cantonese words with their Jyutping romanizations. The CSV file used in this application includes columns for traditional characters, simplified characters, Jyutping, example phrases, definitions, and alternative forms, though only traditional characters and Jyutping are used in the typing practice.

## Contributing
Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and test thoroughly.
4. Submit a pull request with a clear description of your changes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments
- Thanks to [kfcd](https://github.com/kfcd) for providing the [yyzd](https://github.com/kfcd/yyzd) database.
- Built with [Tailwind CSS](https://tailwindcss.com/) for styling.
