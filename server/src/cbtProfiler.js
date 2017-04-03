import fs from 'fs';

const readFile = (path) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (error, data) => {
            if (error) {
                reject(error);
            }
            resolve(data);
        });
    });
};

const parseRows = (content) => {
    const lines = content.trim().split('\n').map((v) => v.trim());
    const rows = [];
    for (const line of lines) {
        const index = line.lastIndexOf(' ');
        const funcs = line.slice(0, index).split(';');
        const unit = parseInt(line.slice(index + 1));
        const row = {funcs, unit};
        rows.push(row);
    }
    return rows;
};

const doConvert = (rows, nm) => {
    const rootNode = {
        id: 1,
        callFrame: {
            columnNumber: -1,
            functionName: '(root)',
            lineNumber: -1,
            scriptId: '0',
            url: '',
        },
        children: [],
        hitCount: 0,
    };
    let nodeCounter = 1;

    const nodes = [rootNode];
    const samples = [];
    const timeDeltas = [1000];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const funcs = row.funcs;
        let diff = -1;

        for (let j = 0; j < funcs.length; j++) {
            if (i === 0) {
                diff = funcs.length;
                break;
            }
            const prevRowFunc = rows[i - 1].funcs[j];
            if (prevRowFunc !== funcs[j]) {
                diff = j;
                break;
            }
        }

        row.nodes = funcs.map(() => null);
        for (let j = 0; j < funcs.length; j++) {
            if (i !== 0 && j < diff) {
                row.nodes[j] = rows[i - 1].nodes[j];
            } else {
                nodeCounter += 1;
                const name = funcs[j];
                let url = '';
                let lineNumber = -1;
                const src = nm[name];
                if (src) {
                    [url, lineNumber] = src.split(':');
                    lineNumber = parseInt(lineNumber) - 1;
                }

                let scriptId;
                if (url === '') {
                    scriptId = '0';
                } else {
                    scriptId = '@' + url;
                }

                const node = {
                    id: nodeCounter,
                    callFrame: {
                        columnNumber: -1,
                        functionName: name,
                        lineNumber: lineNumber,
                        scriptId: scriptId,
                        url: url,
                    },
                    children: [],
                    hitCount: 0,
                };

                row.nodes[j] = node;
                nodes.push(node);
            }
        }

        for (let j = 0; j < funcs.length; j++) {
            const rowNode = row.nodes[j];
            if (j === 0) {
                if (!rootNode.children.includes(rowNode.id)) {
                    rootNode.children.push(rowNode.id);
                }
            }
            const nextRowNode = row.nodes[j + 1];
            if (nextRowNode) {
                if (!rowNode.children.includes(nextRowNode.id)) {
                    rowNode.children.push(nextRowNode.id);
                }
            }

        }

        const lastNode = row.nodes[funcs.length - 1];
        samples.push(lastNode.id);
        timeDeltas.push(row.unit * 1000); // no time unit, treat as 1000s
        lastNode.hitCount += 1;
    }

    samples.push(rows[rows.length - 1].nodes[0].id);

    const startTime = new Date().getTime();
    let endTime = startTime;
    for (const delta of timeDeltas) {
        endTime += delta;
    }

    return {
        nodes,
        samples,
        timeDeltas,
        startTime,
        endTime,
    };
};

const readCbtFiles = async(path, store, modem) => {
    const content = await readFile(path);
    const nm = JSON.parse(await readFile('./nm.txt'));
    if (path.endsWith('.json')) {
        return JSON.parse(content).result.profile;
    }
    const rows = parseRows(content);
    const profile = doConvert(rows, nm, modem);
    for (const node of profile.nodes) {
        const scriptId = node.callFrame.scriptId;
        if (scriptId !== '0') {
            await modem.scriptParsed(scriptId, store);
        }
    }
    return profile;
};

export default readCbtFiles;
