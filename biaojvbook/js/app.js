document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired."); // Debug line
    Promise.all([
        fetch('data/sishu_final.json').then(response => response.json()),
        fetch('data/zhuyu_final.json').then(response => response.json()),
        fetch('data/xunyi_final.json').then(response => response.json())
    ]).then(([sishuData, zhuyuData, xunyiData]) => {
        window.sishuData = sishuData;
        window.zhuyuData = zhuyuData;
        window.xunyiData = xunyiData;
        console.log("Loaded data:", { sishuData, zhuyuData, xunyiData }); // Debug line
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

        const results = { sishu: [], xunyi: [], zhuyu: [] };

        // 搜索四书整理
        for (const chapterName in window.sishuData) {
            if (chapterName === "no_chapter_name" || chapterName === "no_sentence_number") continue;

            const chapter = window.sishuData[chapterName];
            for (const paragraphNumber in chapter) {
                const paragraph = chapter[paragraphNumber];
                for (const sentenceNumber in paragraph) {
                    const sentence = paragraph[sentenceNumber];
                    const contentArray = sentence.content;

                    const match = contentArray.some(item =>
                        originalKeywords.every(keyword => item.text.includes(keyword)) ||
                        traditionalKeywords.every(keyword => item.text.includes(keyword)) ||
                        simplifiedKeywords.every(keyword => item.text.includes(keyword))
                    );

                    if (match) {
                        results.sishu.push({
                            chapter_name: chapterName,
                            paragraph_number: paragraphNumber,
                            sentence_number: sentenceNumber,
                            content: contentArray
                        });
                    }
                }
            }
        }

        // 搜索训义整理
        window.xunyiData.forEach(item => {
            const { text, chapter_name } = item;
            if (originalKeywords.every(keyword => text.includes(keyword)) ||
                traditionalKeywords.every(keyword => text.includes(keyword)) ||
                simplifiedKeywords.every(keyword => text.includes(keyword))) {
                results.xunyi.push(item);
            }
        });

        // 搜索朱子语类
        window.zhuyuData.forEach(chapter => {
            chapter.text.forEach(paragraph => {
                if (originalKeywords.every(keyword => paragraph.text.includes(keyword)) ||
                    traditionalKeywords.every(keyword => paragraph.text.includes(keyword)) ||
                    simplifiedKeywords.every(keyword => paragraph.text.includes(keyword))) {
                    results.zhuyu.push({ ...paragraph, chapter_name: chapter.章节名 });
                }
            });
        });

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

    // 展示四书整理结果
    if (results.sishu.length > 0) {
        const sishuDiv = document.createElement('div');
        sishuDiv.className = 'level-1';
        sishuDiv.id = 'sishu';
        results.sishu.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item'; // Add a class for individual result item
            resultElement.innerHTML = `<strong>【${result.chapter_name}】</strong> `;

            result.content.forEach(item => {
                const textColor = item.type === '经' ? 'blue' : 'green';
                resultElement.innerHTML += `<span style="color:${textColor};">${highlightKeyword(item.text, traditionalKeywords, originalKeywords)}</span> `;
            });

            sishuDiv.appendChild(resultElement);
        });
        resultsDiv.appendChild(sishuDiv);
    }

    // 展示训义整理结果
    if (results.xunyi.length > 0) {
        const xunyiDiv = document.createElement('div');
        xunyiDiv.className = 'level-2';
        xunyiDiv.id = 'xunyi';
        results.xunyi.forEach(result => {
            const resultElement = document.createElement('div'); // Change from <p> to <div>
            resultElement.className = 'result-item'; // Add a class for individual result item
            resultElement.innerHTML = `<strong>【${result.chapter_name}】</strong> ${highlightKeyword(result.text, traditionalKeywords, originalKeywords)}`;
            xunyiDiv.appendChild(resultElement);
        });
        resultsDiv.appendChild(xunyiDiv);
    }

    // 展示朱子语类结果
    if (results.zhuyu.length > 0) {
        const zhuyuDiv = document.createElement('div');
        zhuyuDiv.className = 'level-3';
        zhuyuDiv.id = 'zhuyu';
        results.zhuyu.forEach(result => {
            const resultElement = document.createElement('div'); // Change from <p> to <div>
            resultElement.className = 'result-item'; // Add a class for individual result item
            resultElement.innerHTML = `<strong>【${result.chapter_name}】</strong> ${highlightKeyword(result.text, traditionalKeywords, originalKeywords)}`;
            zhuyuDiv.appendChild(resultElement);
        });
        resultsDiv.appendChild(zhuyuDiv);
    }

    if (results.sishu.length === 0 && results.xunyi.length === 0 && results.zhuyu.length === 0) {
        resultsDiv.textContent = 'No results found.';
    }
}

function generateSummary(results) {
    const summaryDiv = document.getElementById('summary');
    const totalResults = results.sishu.length + results.xunyi.length + results.zhuyu.length;
    const sishuCount = results.sishu.length;
    const xunyiCount = results.xunyi.length;
    const zhuyuCount = results.zhuyu.length;

    let summaryHTML = `搜索结果共${totalResults}条<br>`;
    summaryHTML += `<div class="summary-item" onclick="scrollToBook('sishu')">四书章句集注：${sishuCount}条</div>`;
    summaryHTML += `<div class="summary-item" onclick="scrollToBook('xunyi')">四书训义：${xunyiCount}条</div>`;
    summaryHTML += `<div class="summary-item" onclick="scrollToBook('zhuyu')">朱子语类：${zhuyuCount}条</div>`;

    summaryDiv.innerHTML = summaryHTML;
}

function scrollToBook(bookId) {
    const bookElement = document.getElementById(bookId);
    if (bookElement) {
        bookElement.scrollIntoView({ behavior: 'smooth' });
    }
}
