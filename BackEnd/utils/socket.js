let ioInstance = null;

const ORDER_EVENTS = {
    CREATED: 'orders:created',
    UPDATED: 'orders:updated',
    DELETED: 'orders:deleted',
};

function setSocketServer(io) {
    ioInstance = io;
}

function getSocketServer() {
    return ioInstance;
}

function emitSocketEvent(eventName, payload) {
    if (!ioInstance) {
        return;
    }

    ioInstance.emit(eventName, payload);
}

function emitOrderCreated(orderPayload) {
    emitSocketEvent(ORDER_EVENTS.CREATED, orderPayload);
}

function emitOrderUpdated(orderPayload) {
    emitSocketEvent(ORDER_EVENTS.UPDATED, orderPayload);
}

function emitOrderDeleted(orderPayload) {
    emitSocketEvent(ORDER_EVENTS.DELETED, orderPayload);
}

module.exports = {
    ORDER_EVENTS,
    setSocketServer,
    getSocketServer,
    emitSocketEvent,
    emitOrderCreated,
    emitOrderUpdated,
    emitOrderDeleted,
};
