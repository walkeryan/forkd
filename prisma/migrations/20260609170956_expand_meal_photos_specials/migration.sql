-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "managementNotes" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "serviceNotes" TEXT,
ADD COLUMN     "serviceRating" INTEGER;

-- CreateTable
CREATE TABLE "PlaceSpecial" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dayOfWeek" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceSpecial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaceSpecial_placeId_idx" ON "PlaceSpecial"("placeId");

-- AddForeignKey
ALTER TABLE "PlaceSpecial" ADD CONSTRAINT "PlaceSpecial_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
