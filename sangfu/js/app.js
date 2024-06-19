document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired."); // Debug line
    fetch('data/texts.json')
        .then(response => response.json())
        .then(data => {
            window.textData = data;
            console.log("Loaded data:", data); // Debug line
        })
        .catch(error => console.error('Error loading texts.json:', error));

    document.getElementById('searchInput').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            searchText();
        }
    });
});

function highlightKeyword(text, keywords, originalKeywords) {
    const regex = new RegExp(`(${keywords.concat(originalKeywords).join('|')})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function truncateText(text, keywords) {
    const keywordIndex = text.toLowerCase().indexOf(keywords[0].toLowerCase());
    if (keywordIndex === -1) return text;

    const start = Math.max(0, keywordIndex - 40);
    const end = Math.min(text.length, keywordIndex + keywords[0].length + 40);
    return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
}

function searchText() {
    const originalKeywords = document.getElementById('searchInput').value.split(' ');
    console.log("Original keywords:", originalKeywords); // Debug line
    if (originalKeywords.length === 0 || originalKeywords[0] === '') {
        document.getElementById('results').textContent = 'Please enter a keyword.';
        return;
    }

    const s2tConverter = OpenCC.Converter({ from: 'cn', to: 't' });
    const t2sConverter = OpenCC.Converter({ from: 't', to: 'cn' });

    Promise.all([
        Promise.all(originalKeywords.map(keyword => s2tConverter(keyword))),
        Promise.all(originalKeywords.map(keyword => t2sConverter(keyword)))
    ]).then(([traditionalKeywords, simplifiedKeywords]) => {
        console.log("Traditional keywords:", traditionalKeywords); // Debug line
        console.log("Simplified keywords:", simplifiedKeywords); // Debug line

        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = '';
        const summaryDiv = document.getElementById('summary');
        summaryDiv.innerHTML = '';

        const results = { "level=1": [], "level=2": [], "level=2.5": [], "level=3": [] };

        for (const level in window.textData) {
            const texts = window.textData[level];
            texts.forEach(item => {
                const content = typeof item === 'string' ? item : item.内容;
                const match = originalKeywords.every(keyword => content.includes(keyword)) ||
                    traditionalKeywords.every(keyword => content.includes(keyword)) ||
                    simplifiedKeywords.every(keyword => content.includes(keyword));

                if (match) {
                    results[level].push(item);
                }
            });
        }

        console.log("Search results:", results); // Debug line

        // Display results
        displayResults(results, traditionalKeywords, originalKeywords);

        // Generate summary
        generateSummary(results);
    }).catch(error => {
        console.error('Error during conversion:', error);
    });
}

function displayResults(results, traditionalKeywords, originalKeywords) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (results["level=1"].length > 0) {
        const level1Div = document.createElement('div');
        level1Div.id = 'level-1';
        level1Div.className = 'level-1';
        results["level=1"].forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item'; // Add a class for individual result item
            resultElement.innerHTML = `<strong>经传注:</strong> ${highlightKeyword(result.内容, traditionalKeywords, originalKeywords)}`;
            level1Div.appendChild(resultElement);
        });
        resultsDiv.appendChild(level1Div);
    }

    if (results["level=2"].length > 0) {
        const level2Div = document.createElement('div');
        level2Div.id = 'level-2';
        level2Div.className = 'level-2';
        results["level=2"].forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item'; // Add a class for individual result item
            resultElement.innerHTML
            resultElement.innerHTML = `<strong>锡恭按 [${result.对应经文}]:</strong> ${highlightKeyword(result.内容, traditionalKeywords, originalKeywords)}`;
            level2Div.appendChild(resultElement);
        });
        resultsDiv.appendChild(level2Div);
    }

    if (results["level=2.5"].length > 0) {
        const level25Div = document.createElement('div');
        level25Div.id = 'level-2.5';
        level25Div.className = 'level-2-5';
        results["level=2.5"].forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item'; // Add a class for individual result item
            resultElement.innerHTML = `<strong>锡恭段内按 [${result.对应经文}]:</strong> ${highlightKeyword(result.内容, traditionalKeywords, originalKeywords)}`;
            level25Div.appendChild(resultElement);
        });
        resultsDiv.appendChild(level25Div);
    }

    if (results["level=3"].length > 0) {
        const level3Div = document.createElement('div');
        level3Div.id = 'level-3';
        level3Div.className = 'level-3';
        results["level=3"].forEach(result => {
            const truncatedContent = truncateText(result.内容, originalKeywords);
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item'; // Add a class for individual result item
            resultElement.innerHTML = `<strong>疏及其他 [${result.对应经文}]:</strong> ${highlightKeyword(truncatedContent, traditionalKeywords, originalKeywords)}`;
            level3Div.appendChild(resultElement);
        });
        resultsDiv.appendChild(level3Div);
    }

    if (results["level=1"].length === 0 && results["level=2"].length === 0 && results["level=2.5"].length === 0 && results["level=3"].length === 0) {
        resultsDiv.textContent = 'No results found.';
    }
}

function generateSummary(results) {
    const summaryDiv = document.getElementById('summary');
    const totalResults = results["level=1"].length + results["level=2"].length + results["level=2.5"].length + results["level=3"].length;
    const level1Count = results["level=1"].length;
    const level2Count = results["level=2"].length;
    const level25Count = results["level=2.5"].length;
    const level3Count = results["level=3"].length;

    let summaryHTML = `搜索结果共${totalResults}条<br>`;
    summaryHTML += `<div class="summary-item" onclick="scrollToLevel('level-1')">经传注：${level1Count}条</div>`;
    summaryHTML += `<div class="summary-item" onclick="scrollToLevel('level-2')">锡恭按：${level2Count}条</div>`;
    summaryHTML += `<div class="summary-item" onclick="scrollToLevel('level-2.5')">锡恭段内按：${level25Count}条</div>`;
    summaryHTML += `<div class="summary-item" onclick="scrollToLevel('level-3')">疏及其他：${level3Count}条</div>`;

    summaryDiv.innerHTML = summaryHTML;
}

function scrollToLevel(levelId) {
    const levelElement = document.getElementById(levelId);
    if (levelElement) {
        levelElement.scrollIntoView({ behavior: 'smooth' });
    }
}
