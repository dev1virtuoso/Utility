let words = [];
let currentWord = {};
let score = 0;
let isAnswered = false;

async function loadCSV() {
    try {
        const response = await fetch('cantonese_words.csv');
        const text = await response.text();
        words = parseCSV(text);
        displayWord();
    } catch (error) {
        console.error('Error loading CSV:', error);
    }
}

function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const result = [];
    const headers = lines[0].split(',').map(header => header.trim());

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(col => col.trim());
        if (cols.length >= 3) {
            result.push({
                traditional: cols[0],
                simplified: cols[1],
                jyutping: cols[2]
            });
        }
    }
    return result;
}

function getRandomWord() {
    return words[Math.floor(Math.random() * words.length)];
}

function removeTone(jyutping) {
    return jyutping.replace(/[0-9]/g, '');
}

function displayWord() {
    currentWord = getRandomWord();
    document.getElementById('wordDisplay').textContent = currentWord.traditional;
    document.getElementById('userInput').value = '';
    document.getElementById('result').textContent = '';
    document.getElementById('submitBtn').style.display = 'inline-block';
    document.getElementById('continueBtn').style.display = 'none';
    isAnswered = false;
}

function checkInput() {
    if (isAnswered) return;
    const userInput = document.getElementById('userInput').value.trim().toLowerCase();
    const correctPinyin = removeTone(currentWord.jyutping);
    const correctCharacter = currentWord.traditional;
    const resultElement = document.getElementById('result');
    if (userInput === correctPinyin || userInput === correctCharacter) {
        resultElement.textContent = `Correct! The full pinyin is: ${currentWord.jyutping}`;
        resultElement.className = 'result-correct';
        score++;
    } else {
        resultElement.textContent = `Wrong! The correct pinyin is: ${currentWord.jyutping}`;
        resultElement.className = 'result-wrong';
    }
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('continueBtn').style.display = 'inline-block';
    isAnswered = true;
}

document.getElementById('submitBtn').addEventListener('click', checkInput);
document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkInput();
});
document.getElementById('continueBtn').addEventListener('click', displayWord);

window.onload = loadCSV;