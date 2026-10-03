const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("\n===== W4.4 REAL DB KEYWORD CRUD TEST =====");

  const marker = `w4-functional-${Date.now()}`;
  const entitySlug = `w4-test-route-${Date.now()}`;

  const keywordText = `Pune to Mumbai cab ${marker}`;

  const normalizedKeyword = keywordText
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  let createdKeywordId = null;
  let createdEntityId = null;

  try {

    // ========================================================
    // 1. CREATE TEMPORARY ENTITY
    // ========================================================

    const entity = await prisma.websiteSeoEntity.create({
      data: {
        type: "ROUTE",
        name: `W4 Test Route ${marker}`,
        slug: entitySlug,
        status: "DRAFT",
        metadata: {
          source: "W4.4_FUNCTIONAL_TEST",
          marker
        }
      }
    });

    createdEntityId = entity.id;

    if (!entity.id) {
      throw new Error("ENTITY CREATE returned no ID.");
    }

    console.log("TEST ENTITY            PASS");


    // ========================================================
    // 2. CREATE KEYWORD
    // ========================================================

    const created = await prisma.websiteSeoKeyword.create({
      data: {
        keyword: keywordText,
        normalizedKeyword,
        type: "ROUTE",
        intent: "TRANSACTIONAL",
        status: "DISCOVERED",

        entityId: entity.id,
        entityType: "ROUTE",

        clusterKey: "pune-to-mumbai-cab",

        metrics: {
          searchVolume: 1000,
          difficulty: 25,
          cpc: 15,
          competition: 0.5,
          opportunityScore: 80
        },

        metadata: {
          source: "W4.4_FUNCTIONAL_TEST",
          marker
        }
      }
    });

    createdKeywordId = created.id;

    if (!created.id) {
      throw new Error("CREATE returned no ID.");
    }

    console.log("CREATE                 PASS");


    // ========================================================
    // 3. READ BY ID
    // ========================================================

    const read =
      await prisma.websiteSeoKeyword.findUnique({
        where: {
          id: created.id
        }
      });

    if (
      !read ||
      read.keyword !== keywordText ||
      read.entityId !== entity.id
    ) {
      throw new Error("READ BY ID mismatch.");
    }

    console.log("READ BY ID             PASS");


    // ========================================================
    // 4. NORMALIZED + ENTITY LOOKUP
    // ========================================================

    const normalizedRead =
      await prisma.websiteSeoKeyword.findFirst({
        where: {
          normalizedKeyword,
          entityId: entity.id
        }
      });

    if (
      !normalizedRead ||
      normalizedRead.id !== created.id
    ) {
      throw new Error(
        "NORMALIZED ENTITY LOOKUP failed."
      );
    }

    console.log("NORMALIZED LOOKUP      PASS");


    // ========================================================
    // 5. FILTER
    // ========================================================

    const filtered =
      await prisma.websiteSeoKeyword.findMany({
        where: {
          id: created.id,
          type: "ROUTE",
          intent: "TRANSACTIONAL",
          status: "DISCOVERED",
          entityId: entity.id,
          entityType: "ROUTE",
          clusterKey: "pune-to-mumbai-cab"
        }
      });

    if (filtered.length !== 1) {
      throw new Error(
        `FILTER expected 1 record, found ${filtered.length}.`
      );
    }

    console.log("LIST / FILTER          PASS");


    // ========================================================
    // 6. UPDATE
    // ========================================================

    const updated =
      await prisma.websiteSeoKeyword.update({
        where: {
          id: created.id
        },

        data: {
          status: "APPROVED",
          type: "PRIMARY",

          metrics: {
            searchVolume: 1200,
            difficulty: 30,
            cpc: 18,
            competition: 0.6,
            opportunityScore: 85
          }
        }
      });

    if (
      updated.status !== "APPROVED" ||
      updated.type !== "PRIMARY"
    ) {
      throw new Error(
        "UPDATE values were not persisted."
      );
    }

    console.log("UPDATE                 PASS");


    // ========================================================
    // 7. VERIFY UPDATE
    // ========================================================

    const verifyUpdate =
      await prisma.websiteSeoKeyword.findUnique({
        where: {
          id: created.id
        }
      });

    if (
      !verifyUpdate ||
      verifyUpdate.status !== "APPROVED" ||
      verifyUpdate.type !== "PRIMARY"
    ) {
      throw new Error(
        "UPDATE verification failed."
      );
    }

    console.log("UPDATE VERIFY          PASS");


    // ========================================================
    // 8. DUPLICATE CONSTRAINT — SAME ENTITY
    // ========================================================

    let duplicateBlocked = false;

    try {

      await prisma.websiteSeoKeyword.create({
        data: {
          keyword: keywordText.toUpperCase(),
          normalizedKeyword,

          type: "SECONDARY",
          intent: "COMMERCIAL",
          status: "DISCOVERED",

          entityId: entity.id,
          entityType: "ROUTE"
        }
      });

    } catch (error) {

      if (error && error.code === "P2002") {
        duplicateBlocked = true;
      } else {
        throw error;
      }
    }

    if (!duplicateBlocked) {
      throw new Error(
        "Entity-scoped duplicate normalized keyword was not blocked."
      );
    }

    console.log("DUPLICATE GUARD        PASS");


    // ========================================================
    // 9. DELETE KEYWORD
    // ========================================================

    await prisma.websiteSeoKeyword.delete({
      where: {
        id: created.id
      }
    });

    createdKeywordId = null;

    const afterDelete =
      await prisma.websiteSeoKeyword.findUnique({
        where: {
          id: created.id
        }
      });

    if (afterDelete !== null) {
      throw new Error(
        "DELETE verification failed."
      );
    }

    console.log("DELETE                 PASS");
    console.log("DELETE VERIFY          PASS");


    // ========================================================
    // 10. DELETE TEMP ENTITY
    // ========================================================

    await prisma.websiteSeoEntity.delete({
      where: {
        id: entity.id
      }
    });

    createdEntityId = null;

    const entityAfterDelete =
      await prisma.websiteSeoEntity.findUnique({
        where: {
          id: entity.id
        }
      });

    if (entityAfterDelete !== null) {
      throw new Error(
        "ENTITY CLEANUP verification failed."
      );
    }

    console.log("ENTITY CLEANUP         PASS");


    // ========================================================
    // FINAL
    // ========================================================

    console.log(
      "\n=============================================="
    );

    console.log(
      " W4.4 REAL KEYWORD CRUD FUNCTIONAL TEST : PASS"
    );

    console.log(
      "=============================================="
    );

    console.log("Real PostgreSQL DB      PASS");
    console.log("Entity Relationship     PASS");
    console.log("Create                  PASS");
    console.log("Read                    PASS");
    console.log("Normalized Lookup       PASS");
    console.log("List / Filter           PASS");
    console.log("Update                  PASS");
    console.log("Duplicate Constraint    PASS");
    console.log("Delete                  PASS");
    console.log("Cleanup                 PASS");

  } finally {

    // ========================================================
    // SAFETY CLEANUP
    // ========================================================

    if (createdKeywordId) {

      await prisma.websiteSeoKeyword.deleteMany({
        where: {
          id: createdKeywordId
        }
      });

      createdKeywordId = null;
    }

    await prisma.websiteSeoKeyword.deleteMany({
      where: {
        metadata: {
          path: ["marker"],
          equals: marker
        }
      }
    });

    if (createdEntityId) {

      await prisma.websiteSeoKeyword.deleteMany({
        where: {
          entityId: createdEntityId
        }
      });

      await prisma.websiteSeoEntity.deleteMany({
        where: {
          id: createdEntityId
        }
      });

      createdEntityId = null;
    }

    await prisma.websiteSeoEntity.deleteMany({
      where: {
        slug: entitySlug
      }
    });

    console.log("\nSAFETY CLEANUP          PASS");
  }
}

main()
  .catch((error) => {

    console.error(
      "\nW4.4 TEST FAILED"
    );

    console.error(error);

    process.exitCode = 1;

  })
  .finally(async () => {

    await prisma.$disconnect();

  });