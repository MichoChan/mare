import cbtProfiler from '../../cbtProfiler';

const Profiler = {};

Profiler.start = async () => {
    return null;
};

Profiler.stop = async (req, store, modem) => {
    let profile = {};
    try {
        profile = await cbtProfiler('./profiler_test.cbt', store, modem);
    } catch (e) {
        console.error(e);
    }

    return {profile};
};

export default Profiler;
