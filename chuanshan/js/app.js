document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired."); // Debug line
    Promise.all([
        fetch('data/DTJL_final.json').then(response => response.json()),
        fetch('data/CSSL_final.json').then(response => response.json())
    ]).then(([DTJLData, CSSLData]) => {
        window.DTJLData = DTJLData;
        window.CSSLData = CSSLData;
        console.log("Loaded data:", { DTJLData, CSSLData }); // Debug line
    }).catch(error => console.error('Error loading JSON files:', error));

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

        const results = { DTJL: [], CSSL: [] };

        // 搜索DTJL
        window.DTJLData.forEach(item => {
            const { 章节名, text } = item;
            if (originalKeywords.every(keyword => text.includes(keyword)) ||
                traditionalKeywords.every(keyword => text.includes(keyword)) ||
                simplifiedKeywords.every(keyword => text.includes(keyword))) {
                results.DTJL.push(item);
            }
        });

        // 搜索CSSL
        window.CSSLData.forEach(item => {
            const { 章节名, text, level, 书名 } = item;
            if (originalKeywords.every(keyword => text.includes(keyword)) ||
                traditionalKeywords.every(keyword => text.includes(keyword)) ||
                simplifiedKeywords.every(keyword => text.includes(keyword))) {
                results.CSSL.push(item);
            }
        });

        // 按level排序CSSL结果
        results.CSSL.sort((a, b) => a.level - b.level);

        // 展示结果
        displayResults(results, traditionalKeywords, originalKeywords);

        // 生成结果统计信息
        generateSummary(results);
    }).catch(error => {
        console.error('Error during conversion:', error);
    });
}

function displayResults(results, traditionalKeywords, originalKeywords) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    // 展示DTJL结果
    if (results.DTJL.length > 0) {
        const DTJLDiv = document.createElement('div');
        DTJLDiv.className = 'level-1';
        DTJLDiv.id = 'DTJL';
        results.DTJL.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item'; // Add a class for individual result item
            resultElement.innerHTML = `<strong>【${result.章节名}】</strong> ${highlightKeyword(result.text, traditionalKeywords, originalKeywords)}`;
            DTJLDiv.appendChild(resultElement);
        });
        resultsDiv.appendChild(DTJLDiv);
    }

    // 展示CSSL结果
    if (results.CSSL.length > 0) {
        results.CSSL.forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.className = result.level === 2 ? 'level-2' : 'level-3';
            resultDiv.id = result.书名;
            const resultElement = document.createElement('div'); // Change from <p> to <div>
            resultElement.className = 'result-item'; // Add a class for individual result item
            resultElement.innerHTML = `<strong>【${result.章节名}】</strong> ${highlightKeyword(result.text, traditionalKeywords, originalKeywords)}`;
            resultDiv.appendChild(resultElement);
            resultsDiv.appendChild(resultDiv);
        });
    }

    if (results.DTJL.length === 0 && results.CSSL.length === 0) {
        resultsDiv.textContent = 'No results found.';
    }
}

function generateSummary(results) {
    const summaryDiv = document.getElementById('summary');
    const totalResults = results.DTJL.length + results.CSSL.length;
    const DTJLCount = results.DTJL.length;
    const bookCounts = {};
    results.CSSL.forEach(result => {
        const bookName = result.书名;
        if (!bookCounts[bookName]) {
            bookCounts[bookName] = 0;
        }
        bookCounts[bookName]++;
    });

    let summaryHTML = `搜索结果共${totalResults}条<br>`;
    summaryHTML += `<div class="summary-item" onclick="scrollToBook('DTJL')">读通鉴论：${DTJLCount}条</div>`;
    for (const [bookName, count] of Object.entries(bookCounts)) {
        summaryHTML += `<div class="summary-item" onclick="scrollToBook('${bookName}')">${bookName}：${count}条</div>`;
    }

    summaryDiv.innerHTML = summaryHTML;
}

function scrollToBook(bookId) {
    const bookElement = document.getElementById(bookId);
    if (bookElement) {
        bookElement.scrollIntoView({ behavior: 'smooth' });
    }
}
