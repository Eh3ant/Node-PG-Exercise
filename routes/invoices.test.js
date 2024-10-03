process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../app');
const db = require('../db');

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


let invoiceId;
beforeEach(async () => {
    await db.query(`DELETE FROM invoices`);
    await db.query(`DELETE FROM companies`);
    await db.query(`
        INSERT INTO companies (code, name, description)
        VALUES ('apple', 'Apple Inc.', 'Tech company')
    `);
    const result = await db.query(`INSERT INTO invoices (comp_Code, amt, paid, paid_date)
  VALUES ('apple', 100, false, null) RETURNING id`);

    invoiceId = result.rows[0].id;
});

// Clean up after each test
afterEach(async () => {
    await db.query(`DELETE FROM invoices`);
});

// Drop tables and close the database connection after all tests are finished
afterAll(async () => {
    await db.query(`DROP TABLE IF EXISTS invoices`);
    await db.query(`DROP TABLE IF EXISTS companies`);
    await db.end();
});


// Test cases for the routes
describe("GET /invoices", () => {
    test("Gets a list of invoices", async () => {
        const response = await request(app).get('/invoices');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            invoices: [
                {
                    id: expect.any(Number),
                    comp_code: 'apple',
                    amt: 100,
                    paid: false,
                    add_date: expect.any(String),
                    paid_date: null
                }
            ]
        });
    });
});

describe("GET /invoices/:id", () => {

    // Success case
    test("Gets a single invoice by id", async () => {

        const response = await request(app).get(`/invoices/${invoiceId}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            invoice: {
                id: invoiceId,
                comp_code: 'apple',
                amt: 100,
                paid: false,
                add_date: expect.any(String),
                paid_date: null
            }
        });
    });

    // Failure case
    test("Responds with 404 if can't find invoice", async () => {
        const response = await request(app).get('/invoices/0');
        expect(response.statusCode).toBe(404);
        expect(response.body.error.message).toEqual("Can't find the invoice with id 0 ");
    });

});


describe("POST /invoices", () => {

    // Success case
    test("Creates a new invoice", async () => {
        await db.query(`
            INSERT INTO companies (code, name, description)
            VALUES ('ibm', 'IBM Inc.', 'Technology company')
        `);

        const response = await request(app)
            .post('/invoices')
            .send({ comp_code: 'ibm', amt: 500 });

        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({
            invoice: {
                id: expect.any(Number),
                comp_code: 'ibm',
                amt: 500,
                paid: false,
                add_date: expect.any(String),
                paid_date: null
            }
        });
    });

    // Failure case when company does not exist
    test("Responds with 400 if company does not exist", async () => {
        const response = await request(app)
            .post('/invoices')
            .send({ comp_code: 'nonexistent', amt: 300 });

        expect(response.statusCode).toBe(400);
        expect(response.body.error.message).toEqual("Company with code 'nonexistent' does not exist.");
    });
});


describe("PUT /invoices/:id", () => {

    // Success case
    test("Updates an existing invoice", async () => {

        await db.query(`
            INSERT INTO companies (code, name, description)
            VALUES ('microsoft', 'Microsoft Corp.', 'Tech company')
        `);

        const invoice = await db.query(`
            INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
            VALUES ('microsoft', 400, false, CURRENT_DATE, null)
            RETURNING id
        `);

        const invoiceId = invoice.rows[0].id;

        // Update the invoice
        const response = await request(app)
            .put(`/invoices/${invoiceId}`)
            .send({ amt: 600 });

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            invoice: {
                id: invoiceId,
                comp_code: 'microsoft',
                amt: 600,
                paid: false,
                add_date: expect.any(String),
                paid_date: null
            }
        });
    });

    // Failure case 
    test("Responds with 404 if invoice does not exist", async () => {
        const response = await request(app)
            .put('/invoices/0')
            .send({ amt: 500 });

        expect(response.statusCode).toBe(404);
        expect(response.body.error.message).toEqual("Can't find the company with code 0");
    });
});


describe("DELETE /companies/:code", () => {

    // Success case
    test("Deletes an existing company", async () => {
        await db.query(`
            INSERT INTO companies (code, name, description)
            VALUES ('tesla', 'Tesla Inc.', 'Electric vehicle company')
        `);

        const response = await request(app).delete('/companies/tesla');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ status: "deleted" });

        const result = await db.query(`SELECT * FROM companies WHERE code = 'tesla'`);
        expect(result.rows.length).toBe(0);
    });

    // Failure case 
    test("Responds with 404 if company does not exist", async () => {
        const response = await request(app).delete('/companies/nonexistent');
        expect(response.statusCode).toBe(404);
        expect(response.body.error.message).toEqual("Can't find the company with code nonexistent");
    });
});







