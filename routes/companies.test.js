process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../app');
const db = require('../db');
const ExpressError = require("../expressError");


// Ensure tables are created before tests
beforeAll(async () => {
    await db.query(`
    CREATE TABLE IF NOT EXISTS companies (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );
    `);

    await db.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      comp_code TEXT NOT NULL REFERENCES companies(code) ON DELETE CASCADE,
      amt FLOAT NOT NULL,
      paid BOOLEAN DEFAULT false,
      add_date DATE DEFAULT CURRENT_DATE,
      paid_date DATE
    );
    `);
});

// Seed some test data before running tests
beforeEach(async () => {
    await db.query(`DELETE FROM companies`);
    await db.query(`INSERT INTO companies (code, name, description) VALUES ('apple', 'Apple Inc.', 'Tech company')`);
});

// Clean up after each test
afterEach(async () => {
    await db.query(`DELETE FROM companies`);
});

// Drop tables and close the database connection after all tests are finished
afterAll(async () => {
    await db.query(`DROP TABLE IF EXISTS invoices`);
    await db.query(`DROP TABLE IF EXISTS companies`);
    await db.end();
});

// Test cases for the routes
describe("GET /companies", () => {
    test("Gets a list of companies", async () => {
        const response = await request(app).get('/companies');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            companies: [
                { code: 'apple', name: 'Apple Inc.', description: 'Tech company' }
            ]
        });
    });
});

describe("GET /companies/:code", () => {
    test('get a single company', async () => {
        const res = await request(app).get('/companies/apple')
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({
            company: {
                code: 'apple',
                name: 'Apple Inc.',
                description: 'Tech company'
            },
            invoices: []
        });
    });
    test("Response with 404 for invalid id", async () => {
        const res = await request(app).get('/companies/unknown')
        expect(res.statusCode).toBe(404)
    })
});

describe("POST /companies", () => {
    test("create a single company", async () => {
        const res = await request(app).post('/companies').send({ code: 'tesla', name: 'Tesla', description: 'EV cars' })
        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({ company: { code: 'tesla', name: 'Tesla', description: "EV cars" } })
    })
})

describe("PUT /companies/:code", () => {
    test("Update a single company", async () => {
        const res = await request(app).put('/companies/apple').send({ code: 'apple', name: 'Apple', description: 'Tech company' })
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({ company: { code: 'apple', name: 'Apple', description: "Tech company" } })
    })
    test("Response with 404 for invalid code", async () => {
        const res = await request(app).put('/companies/unknown')
        expect(res.statusCode).toBe(404)
    })
})

describe('DELETE /companies/:code', () => {
    test('Delete a single company', async () => {
        const res = await request(app).delete('/companies/apple');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ status: "deleted" })
    })
})






