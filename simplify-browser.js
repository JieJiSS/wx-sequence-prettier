// This is the browser-compatible version
// dependency: https://unpkg.com/sweetalert@2.1.2/dist/sweetalert.min.js

// pattern = prefix + splitter + element
const splitterRegEx = /[。:\.\s]\s*/;
const prefixRegEx = /[\(（]?(\d+)[）\)]?/;

/**
 * @description get user input.
 * 
 * @param {string} promptText
 * @returns {Promise<string>}
 */
const getInput = function getInput(promptText) {
    return new Promise(resolve => {
        swal(promptText, {
            content: {
                element: "textarea",
                attributes: {
                    placeholder: "Paste your text here...",
                    id: "get-input-textarea"
                }
            }
        }).then(() => {
            resolve(document.getElementById("get-input-textarea").value);
        });
    });
};

/**
 * 
 * @param {string[]} lines
 * @returns {any[]}
 */
function analyzeSequence(lines) {
    const sequence = new Array(lines.length);

    // assume the last line always contains an element
    const patternText = lines[lines.length - 1];
    if(!splitterRegEx.test(patternText)) return [];
    if(!prefixRegEx.test(patternText)) console.warn("[WARN] Failed to match line id.");

    // in case we might meet explanational texts in the first line
    let leadingText = "";
    let totalLen = 0, averageLen = 0, len = Array.from(new Array(lines.length - 1), () => 0);
    let totalSymbolCnt = 0, averageSymbolCnt = 0, symbolCnt = Array.from(new Array(lines.length - 1), () => 0);

    // let's leave the first line alone
    for(let i = lines.length - 1; i >= 1; i--) {
        const line = lines[i];
        
        totalLen += line.length;
        len[i - 1] = line.length;

        const lineSymbolCnt = line.split(/[\.。，！…（）~“”：；、《》\*\&]/).length - 1
        totalSymbolCnt += lineSymbolCnt;
        symbolCnt[i - 1] = lineSymbolCnt;

        const [prefix, element] = line.split(splitterRegEx);
        if(!element) {
            console.warn("[WARN] Failed to analyze line", i);
            // leave this line unchanged
            sequence[i] = [false, line];
            continue;
        }

        if(!prefixRegEx.test(prefix)) console.warn("[WARN] Prefix match failed for line", i);
        sequence[i] = [true, element.trim()];
    }

    averageLen = totalLen / (lines.length - 1);
    averageSymbolCnt = totalSymbolCnt / (lines.length - 1);

    const firstLineLen = lines[0].length;
    const firstLineSymbolCnt = lines[0].split(/[。，！…（）~“”：；、《》\*\&]/).length - 1;

    let totalDist = 0, avgDist = 0, dist = Array.from(new Array(lines.length - 1), () => 0);
    for(let i = lines.length - 1; i >= 1; i--) {
        const lineLen = len[i - 1], lineSymbolCnt = symbolCnt[i - 1];
        const lineDist = Math.sqrt(
            (lineLen - averageLen) ** 2 +
            (lineSymbolCnt - averageSymbolCnt) ** 2
        );
        totalDist += lineDist;
        dist[i - 1] = lineDist;
    }
    avgDist = totalDist / (lines.length - 1);

    const distStdDeviation = Math.sqrt(
        dist.reduce((prev, curr) => prev + (curr - avgDist) ** 2, 0)
    );

    const firstLineDist = Math.sqrt(
        (averageLen - firstLineLen) ** 2 +
        (averageSymbolCnt - firstLineSymbolCnt) ** 2
    );

    // 6 * standard deviation
    if(firstLineDist >= 6 * distStdDeviation) {
        console.log("[INFO] First line classified as leading text.");
        sequence[0] = [false, ""];
        leadingText = lines[0];
    } else {
        if(!splitterRegEx.test(lines[0])) {
            console.warn("[WARN] First line classified as element, but failed to parse.");
            sequence[0] = [false, ""];
            leadingText = lines[0];
        } else {
            sequence[0] = [false, lines[0].split(splitterRegEx)[1]];
        }
    }

    return [leadingText, sequence];
}

async function main() {
    const text = (await getInput("Paste the original sequence text here: ")).trim();
    if(text.length === 0) return 0;

    const lines = text.split(/\n|\s{4,}/m).filter(str => !!str);
    if(lines.length <= 3) {
        console.error("[ERRO] Too few lines (<=3) to analyze.");
        return 1;
    }

    let [leadingText, elements] = analyzeSequence(lines.map(line => line.trim()));
    if(elements[0][1] === "") elements = elements.slice(1);
    if(elements.length === 0) {
        console.error("[ERRO] Analyze failed, might be caused by uncommon text patterns.");
        return 2;
    }
    let result = "";
    result += leadingText + "\n";
    let id = 0;
    result += elements.map(el => {
        if(el[0] === false) {
            // reset id
            id = 0;
            return el[1];
        } else return (++id) + ". " + el[1];
    }).join("\n");
    swal("Result (please copy):", {
        content: {
            element: "textarea",
            attributes: {
                placeholder: "",
                id: "result-textarea"
            }
        }
    });
    const interval = setInterval(() => {
        console.log(swal.getState());
        if(swal.getState().isOpen === true) {
            clearInterval(interval);
            document.getElementById("result-textarea").value = result;
            document.getElementById("result-textarea").select();
            document.getElementById("result-textarea").focus();
        }
    }, 200);
    return 0;
}

main();
