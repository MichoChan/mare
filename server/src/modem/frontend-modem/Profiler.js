import fs from 'fs';

const Profiler = {};

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

Profiler.start = async () => {
    return null;
};

Profiler.stop = async (req) => {
    console.log(req);
    let result = {};
    try {
        const content = await readFile('profiler_test.json');
        console.log(JSON.parse(content));
        result = JSON.parse(content).result.profile;
    } catch (e) {
    }

    return {profile: result};
};

export default Profiler;
