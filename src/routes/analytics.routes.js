const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireRole, authenticateToken } = require('../middlewares/authMiddleware');
const { STATUS_NAMES, SERVICE_REQUEST_STATUS, CAR_STATUS } = require('../constants');

const router = express.Router();
const prisma = new PrismaClient();

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfWeek(date) {
    const d = startOfDay(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function formatYYYYMMDD(date) {
    const d = new Date(date);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

router.get('/mechanic/repairs-last-week', requireRole('admin'), async (req, res) => {
    try {
        const today = startOfDay(new Date());
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);

        const repairs = await prisma.repair.findMany({
            where: {
                createdAt: { gte: sevenDaysAgo, lte: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) },
            },
            select: { id: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        const series = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(sevenDaysAgo.getDate() + i);
            series[formatYYYYMMDD(d)] = 0;
        }
        repairs.forEach((r) => {
            const key = formatYYYYMMDD(r.createdAt);
            if (key in series) series[key] += 1;
        });

        res.json({ success: true, data: Object.entries(series).map(([date, count]) => ({ date, count })) });
    } catch (error) {
        console.error('Error en repairs-last-week:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

router.get('/cars/by-status', requireRole('admin'), async (req, res) => {
    try {
        const cars = await prisma.car.groupBy({
            by: ['statusId'],
            _count: { _all: true },
        });
        const data = cars.map((c) => ({
            statusId: c.statusId,
            statusName: STATUS_NAMES[c.statusId] || String(c.statusId),
            count: c._count._all,
        }));
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error en cars/by-status:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

router.get('/mechanics/cars-assigned', requireRole('admin'), async (req, res) => {
    try {
        const cars = await prisma.car.groupBy({
            by: ['mechanicId'],
            where: { mechanicId: { not: null } },
            _count: { _all: true },
        });

        const mechanicIds = cars.map((c) => c.mechanicId);
        const mechs = mechanicIds.length
            ? await prisma.mechanic.findMany({
                where: { id: { in: mechanicIds } },
                include: { user: { select: { name: true, lastName: true } } },
            })
            : [];
        const mechMap = new Map(mechs.map((m) => [m.id, `${m.user?.name || ''} ${m.user?.lastName || ''}`.trim()]));

        const data = cars.map((c) => ({
            mechanicId: c.mechanicId,
            mechanicName: mechMap.get(c.mechanicId) || `Mecánico #${c.mechanicId}`,
            count: c._count._all,
        }));
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error en mechanics/cars-assigned:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

router.get('/boss/workload-by-mechanic', requireRole('admin'), async (req, res) => {
    try {
        const activeStatuses = [CAR_STATUS.EN_REVISION, CAR_STATUS.EN_REPARACION];
        const cars = await prisma.car.groupBy({
            by: ['mechanicId'],
            where: {
                mechanicId: { not: null },
                statusId: { in: activeStatuses },
            },
            _count: { _all: true },
        });
        const mechanicIds = cars.map((c) => c.mechanicId);
        const mechs = mechanicIds.length
            ? await prisma.mechanic.findMany({
                where: { id: { in: mechanicIds } },
                include: { user: { select: { name: true, lastName: true } } },
            })
            : [];
        const mechMap = new Map(mechs.map((m) => [m.id, `${m.user?.name || ''} ${m.user?.lastName || ''}`.trim()]));
        const data = cars.map((c) => ({
            mechanicId: c.mechanicId,
            mechanicName: mechMap.get(c.mechanicId) || `Mecánico #${c.mechanicId}`,
            count: c._count._all,
        }));
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error en boss/workload-by-mechanic:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

router.get('/clients/registered-last-month', requireRole('admin'), async (req, res) => {
    try {
        const today = startOfDay(new Date());
        const start = new Date(today);
        start.setMonth(today.getMonth() - 1);
        const clients = await prisma.client.findMany({
            where: { createdAt: { gte: start, lte: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) } },
            select: { id: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        const days = {};
        for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
            days[formatYYYYMMDD(d)] = 0;
        }
        clients.forEach((c) => {
            days[formatYYYYMMDD(c.createdAt)] = (days[formatYYYYMMDD(c.createdAt)] || 0) + 1;
        });
        res.json({ success: true, data: Object.entries(days).map(([date, count]) => ({ date, count })) });
    } catch (error) {
        console.error('Error en clients/registered-last-month:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

router.get('/cars/ingresados-por-semana', requireRole('admin'), async (req, res) => {
    try {
        const today = startOfDay(new Date());
        const start = new Date(today);
        start.setDate(today.getDate() - 7 * 7);

        const cars = await prisma.car.findMany({
            where: { createdAt: { gte: start } },
            select: { id: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });


        const buckets = new Map();
        for (const c of cars) {
            const wk = startOfWeek(c.createdAt).toISOString().slice(0, 10);
            buckets.set(wk, (buckets.get(wk) || 0) + 1);
        }
        const result = Array.from(buckets.entries())
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .map(([weekStart, count]) => ({ weekStart, count }));
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error en cars/ingresados-por-semana:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

router.get('/requests/rejection-rate-weekly', requireRole('admin'), async (req, res) => {
    try {
        const today = startOfDay(new Date());
        const start = new Date(today);
        start.setDate(today.getDate() - 7 * 7);
        const requests = await prisma.serviceRequest.findMany({
            where: { createdAt: { gte: start } },
            select: { id: true, status: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        const buckets = new Map();
        for (const r of requests) {
            const wk = startOfWeek(r.createdAt).toISOString().slice(0, 10);
            const entry = buckets.get(wk) || { total: 0, rejected: 0, cancelled: 0 };
            entry.total += 1;
            if (r.status === SERVICE_REQUEST_STATUS.REJECTED) entry.rejected += 1;
            if (r.status === SERVICE_REQUEST_STATUS.CANCELLED) entry.cancelled += 1;
            buckets.set(wk, entry);
        }
        const data = Array.from(buckets.entries())
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .map(([weekStart, { total, rejected, cancelled }]) => ({
                weekStart,
                total,
                rejected,
                cancelled,
                rate: total > 0 ? (rejected + cancelled) / total : 0,
            }));
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error en requests/rejection-rate-weekly:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

module.exports = router;
