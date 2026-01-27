import { db } from "./db";
import { customers, technicians } from "@shared/schema";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

export async function seedDatabase() {
  console.log("Checking if database needs seeding...");

  try {
    // Check if customers table is empty
    const existingCustomers = await db.select({ count: sql<number>`count(*)` }).from(customers);
    const customerCount = Number(existingCustomers[0]?.count || 0);

    if (customerCount === 0) {
      console.log("Seeding customers from data/customers.json...");
      const customersPath = path.join(process.cwd(), "data", "customers.json");
      
      if (fs.existsSync(customersPath)) {
        const customersData = JSON.parse(fs.readFileSync(customersPath, "utf-8"));
        
        for (const customer of customersData) {
          await db.insert(customers).values({
            id: customer.id,
            externalId: customer.external_id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            state: customer.state,
            zip: customer.zip,
            poolCount: customer.pool_count,
            status: customer.status,
            tags: customer.tags,
            notes: customer.notes,
            chemicalsBudget: customer.chemicals_budget,
            chemicalsBudgetPeriod: customer.chemicals_budget_period,
            repairsBudget: customer.repairs_budget,
            repairsBudgetPeriod: customer.repairs_budget_period,
          }).onConflictDoNothing();
        }
        console.log(`Seeded ${customersData.length} customers`);
      } else {
        console.log("No customers.json file found, skipping customer seed");
      }
    } else {
      console.log(`Database already has ${customerCount} customers, skipping seed`);
    }

    // Check if technicians table is empty
    const existingTechs = await db.select({ count: sql<number>`count(*)` }).from(technicians);
    const techCount = Number(existingTechs[0]?.count || 0);

    if (techCount === 0) {
      console.log("Seeding technicians from data/technicians.json...");
      const techsPath = path.join(process.cwd(), "data", "technicians.json");
      
      if (fs.existsSync(techsPath)) {
        const techsData = JSON.parse(fs.readFileSync(techsPath, "utf-8"));
        
        for (const tech of techsData) {
          await db.insert(technicians).values({
            id: tech.id,
            externalId: tech.external_id,
            firstName: tech.first_name,
            lastName: tech.last_name,
            phone: tech.phone,
            email: tech.email,
            photoUrl: tech.photo_url,
            role: tech.role,
            region: tech.region,
            supervisorId: tech.supervisor_id,
            truckNumber: tech.truck_number,
            commissionPercent: tech.commission_percent,
            active: tech.active,
          }).onConflictDoNothing();
        }
        console.log(`Seeded ${techsData.length} technicians`);
      } else {
        console.log("No technicians.json file found, skipping technician seed");
      }
    } else {
      console.log(`Database already has ${techCount} technicians, skipping seed`);
    }

    console.log("Database seeding complete");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}
