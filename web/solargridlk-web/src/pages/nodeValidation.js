export const inputClassName =
    "w-full box-border px-3.5 py-2.5 bg-[#101a30] border border-[#2a3a56] rounded-md text-[#e7ecf5] text-[0.95rem] placeholder-[#55637f] focus:outline-none focus:border-[#f4a93b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

const hasInternalWhitespaceOrSlash = (value) => /[\s/\\]/.test(value);

export const nodeFieldError = (fields, { requireNodeId = false } = {}) => {
    if (requireNodeId) {
        const nodeId = fields.nodeId.trim();

        if (!nodeId) {
            return "Node ID is required.";
        }

        if (hasInternalWhitespaceOrSlash(nodeId)) {
            return "Node ID cannot contain spaces or slashes.";
        }
    }

    if (!fields.name.trim()) {
        return "Node name is required.";
    }

    if (!fields.location.trim()) {
        return "Location is required.";
    }

    if (fields.latitude.trim() === "") {
        return "Latitude is required.";
    }

    const latitude = Number(fields.latitude);

    if (!Number.isFinite(latitude)) {
        return "Latitude must be a number.";
    }

    if (latitude < -90 || latitude > 90) {
        return "Latitude must be between -90 and 90.";
    }

    if (fields.longitude.trim() === "") {
        return "Longitude is required.";
    }

    const longitude = Number(fields.longitude);

    if (!Number.isFinite(longitude)) {
        return "Longitude must be a number.";
    }

    if (longitude < -180 || longitude > 180) {
        return "Longitude must be between -180 and 180.";
    }

    if (fields.capacityKw.trim() === "") {
        return "Capacity is required.";
    }

    const capacityKw = Number(fields.capacityKw);

    if (!Number.isFinite(capacityKw)) {
        return "Capacity must be a number.";
    }

    if (capacityKw <= 0) {
        return "Capacity must be greater than zero.";
    }

    if (fields.availableBatterySlots.trim() === "") {
        return "Available battery slots are required.";
    }

    const availableBatterySlots = Number(fields.availableBatterySlots);

    if (!Number.isInteger(availableBatterySlots)) {
        return "Available battery slots must be a whole number.";
    }

    if (availableBatterySlots < 0) {
        return "Available battery slots cannot be negative.";
    }

    return "";
};

export const toNodePayload = (fields, { includeNodeId = false } = {}) => {
    const payload = {
        name: fields.name.trim(),
        location: fields.location.trim(),
        latitude: Number(fields.latitude),
        longitude: Number(fields.longitude),
        capacityKw: Number(fields.capacityKw),
        availableBatterySlots: Number(fields.availableBatterySlots),
    };

    if (includeNodeId) {
        payload.nodeId = fields.nodeId.trim();
        // Create requires a schedule list. An empty list is valid until a schedule is saved.
        payload.schedule = [];
    }

    return payload;
};

export const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

const scheduleTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const buildScheduleForm = (schedule = []) => {
    const byDay = new Map((schedule || []).map((slot) => [slot.dayOfWeek, slot]));

    return daysOfWeek.map((day) => ({
        dayOfWeek: day,
        startTime: byDay.get(day)?.startTime || "",
        endTime: byDay.get(day)?.endTime || "",
    }));
};

export const scheduleFieldError = (slots) => {
    for (const slot of slots) {
        const startTime = slot.startTime.trim();
        const endTime = slot.endTime.trim();

        if (!startTime && !endTime) {
            continue;
        }

        if (!scheduleTimePattern.test(startTime) || !scheduleTimePattern.test(endTime)) {
            return "Schedule times must use HH:mm.";
        }

        if (startTime >= endTime) {
            return "Schedule start time must be before end time.";
        }
    }

    return "";
};

export const toSchedulePayload = (slots) => ({
    schedule: slots
        .filter((slot) => slot.startTime.trim() && slot.endTime.trim())
        .map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime.trim(),
            endTime: slot.endTime.trim(),
        })),
});
