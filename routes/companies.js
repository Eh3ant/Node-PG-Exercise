const express = require("express");
const router = new express.Router()
const db = require('../db');
const ExpressError = require("../expressError");


router.get('/', async (req, res, next) => {
    try {
        const results = await db.query(`SELECT * FROM companies`)
        return res.json({ companies: results.rows })
    } catch (e) {
        return next(e)
    }
})

router.get('/:code', async (req, res, next) => {
    try {
        const { code } = req.params
        const companyResult = await db.query(`SELECT * FROM companies WHERE code = $1`, [code])
        if (companyResult.rows.length === 0) {
            throw new ExpressError(`Can't find the company with code ${code} `, 404)
        }
        const invoicesResult = await db.query(
            `SELECT id, comp_code, amt, paid, add_date, paid_date 
       FROM invoices 
       WHERE comp_code = $1`,
            [code]
        );

        const company = companyResult.rows[0];

        const invoices = invoicesResult.rows;

        return res.json({
            company: company,
            invoices: invoices
        })
    } catch (e) {
        next(e)
    }
})

router.post('/', async (req, res, next) => {
    try {
        const { code, name, description } = req.body
        const companyCheck = await db.query(`SELECT code FROM companies WHERE code = $1`, [comp_code]);
        if (companyCheck.rows.length === 0) {
            throw new ExpressError(`Company with code ${comp_code} not found`, 404);
        }
        const results = await db.query(`INSERT INTO companies (code,name,description) VALUES ($1,$2,$3) RETURNING *`, [code, name, description])
        return res.status(201).json({ company: results.rows[0] })
    } catch (e) {
        next(e)
    }
})

router.put('/:code', async (req, res, next) => {
    try {
        const { code } = req.params
        const { name, description } = req.body
        const results = await db.query(`UPDATE companies SET name=$1,description=$2 WHERE code=$3 RETURNING *`, [name, description, code])
        if (results.rows.length === 0) {
            throw new ExpressError(`Can't find the company with code ${code}`, 404)
        }
        return res.json({ company: results.rows[0] })
    } catch (e) {
        next(e)
    }
})

router.delete('/:code', async (req, res, next) => {
    try {
        const { code } = req.params
        const results = await db.query(`DELETE  FROM companies WHERE code=$1 RETURNING code`, [code])
        if (results.rowCount === 0) {
            throw new ExpressError(`Can't find the company with code ${code}`, 404)
        }
        return res.json({ status: "deleted" })

    } catch (e) {
        return next(e)
    }
})






module.exports = router;