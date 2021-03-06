import EventEmitter from 'events';
import {DummyWebSocket} from '../websocket/dummy-websocket';
import {Adapter} from './adapter';

const mktime = () => new Date().getTime();

const parseSessionArgs = (query) => {
    const args = {};
    for (const [key, value] of Object.entries(query)) {
        if (!key.includes('.')) {
            args[key] = value;
            continue;
        }

        const [subKey1, subKey2] = key.split('.');
        if (!args[subKey1]) {
            args[subKey1] = {};
        }
        args[subKey1][subKey2] = value;
    }
    return args;
};

export class Session extends EventEmitter {

    constructor(id) {
        super();

        this.id = id;
        this.creator = 'unknow';
        this.title = 'untitle';
        this.expire = -1;
        this.isFrontendConnected = false;
        this.isBackendConnected = false;
        this.frontendConnectionTime = -1;
        this.backendConnectionTime = -1;
        this.createTime = mktime();

        this.storage = null;
        this.initialized = false;
    }

    initialize(storage) {
        this.storage = storage;
        this.initStore();
        this.initAdapter();
        this.initialized = true;
    }

    initStore() {
        this.store = this.storage.getSessionDataStore(this.id);
    }

    initAdapter() {
        const url = `/session/${this.id}`;
        const fews = DummyWebSocket.fromUrl(url, 'frontend');
        const bews = DummyWebSocket.fromUrl(url, 'backend');
        this.adapter = new Adapter(this.id, fews, bews, this.store);
        this.adapter.on('websocket-close', this.onAdapterWebSocketClose);
    }

    isExpirable() {
        return this.expire >= 0;
    }

    isActiviting() {
        return this.isFrontendConnected || this.isBackendConnected;
    }

    expireAfterSeconds() {
        if (!this.isExpirable() || this.isActiviting()) {
            return -1;
        }

        const fcTime = this.frontendConnectionTime;
        const bcTime = this.backendConnectionTime;
        if (fcTime === -1 && bcTime === -1) {
            return 0;
        }

        const now = mktime();
        const latest = Math.max(fcTime, bcTime);
        const seconds = latest + (this.expire * 1000) - now;
        const result =  Math.round(seconds / 1000);
        if (result < 0) {
            return 0;
        }
        return result;
    }

    setTitle(title) {
        const before = this.title;
        this.title = String(title);
        this.logging('change-title', {before, after: title});
        this.saveToStorage();
    }

    setExpire(expire) {
        const before = this.expire;
        this.expire = expire;
        this.logging('change-expire', {before, after: expire});
        this.saveToStorage();
        this.expireCountdown();
    }

    attachFrontend(ws) {
        clearTimeout(this.expireTimeout);

        const now = mktime();
        this.adapter.replaceFrontendWebSocket(ws);
        this.isFrontendConnected = true;
        this.frontendConnectionTime = now;

        const sessionArgs = parseSessionArgs(ws.location.query);
        this.store.updateProject(sessionArgs.project);
        this.store.scriptParsedFiles = {};

        this.logging('connect', {
            side: 'frontend',
            remoteHost: ws.socket.remoteAddress,
            remotePort: ws.socket.remotePort,
            sessionArgs: sessionArgs,
        }, now);
        this.saveToStorage();
    }

    attachBackend(ws) {
        clearTimeout(this.expireTimeout);

        const now = mktime();
        this.adapter.replaceBackendWebSoceket(ws);
        this.isBackendConnected = true;
        this.backendConnectionTime = now;

        const sessionArgs = parseSessionArgs(ws.location.query);
        this.store.updateProject(sessionArgs.project);

        this.logging('connect', {
            side: 'backend',
            remoteHost: ws.socket.remoteAddress,
            remotePort: ws.socket.remotePort,
            sessionArgs: sessionArgs,
        }, now);
        this.saveToStorage();
    }

    onAdapterWebSocketClose = (side) => {
        const now = mktime();
        const url = `/session/${this.id}`;
        const ws = DummyWebSocket.fromUrl(url, side);

        if (side === 'frontend') {
            this.isFrontendConnected = false;
            this.frontendConnectionTime = now;
            this.adapter.replaceFrontendWebSocket(ws);
        }
        if (side === 'backend') {
            this.isBackendConnected = false;
            this.backendConnectionTime = now;
            this.adapter.replaceBackendWebSoceket(ws);
        }

        this.logging('disconnect', {side}, now);
        this.saveToStorage();
        this.expireCountdown();
    }

    expireCountdown() {
        clearTimeout(this.expireTimeout);
        if (!this.isExpirable() || this.isActiviting()) {
            return;
        }

        this.expireTimeout = setTimeout(() => {
            if (this.expireAfterSeconds() === 0) {
                this.emit('expire', this.id);
            }
        }, this.expire  * 1000);
    }

    cleanup() {
        this.adapter.close();
        this.store.drop();
        this.removeFromStorage();
    }

    destroy() {
        this.adapter.destroy();
        this.store.destroy();
        this.adapter = null;
        this.store = null;
    }

    removeFromStorage = async () => {
        await this.storage.removeSession(this.id);
    }

    saveToStorage = async() => {
        const doc = this.toDoc();
        await this.storage.saveSession(doc);
    }

    logging = async (tag, content, time) => {
        time = time || mktime();
        const log = {tag, content, time, session: this.id};
        await this.storage.logging('session', log);
    }

    toJSON() {
        const {fews, bews} = this.adapter;
        return {
            id: this.id,
            title: this.title,
            expire: this.expire,
            expireAfterSeconds: this.expireAfterSeconds(),
            creator: this.creator,
            createTime: this.createTime,
            isActiviting: this.isActiviting(),
            frontend: {
                isConnected: this.isFrontendConnected,
                connectionTime: this.frontendConnectionTime,
                remoteHost: fews.socket.remoteAddress,
                remotePort: fews.socket.remotePort,
                sessionArgs: parseSessionArgs(fews.location.query),
            },
            backend: {
                isConnected: this.isBackendConnected,
                connectionTime: this.backendConnectionTime,
                remoteHost: bews.socket.remoteAddress,
                remotePort: bews.socket.remotePort,
                sessionArgs: parseSessionArgs(bews.location.query),
            },
        };
    }

    toDoc() {
        return {
            id: this.id,
            title: this.title,
            expire: this.expire,
            creator: this.creator,
            createTime: this.createTime,
            isFrontendConnected: this.isFrontendConnected,
            isBackendConnected: this.isBackendConnected,
            frontendConnectionTime: this.frontendConnectionTime,
            backendConnectionTime: this.backendConnectionTime,
        };
    }

}
