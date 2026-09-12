import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const bookingId = new URL(request.url).searchParams.get("bookingId");
    if (!bookingId) return NextResponse.json({ success:false, message:"bookingId is required." }, { status:400 });

    const booking = await prisma.booking.findUnique({
      where:{ id:bookingId },
      select:{
        id:true, customerId:true, vendorId:true, vehicleId:true, driverId:true,
        pickupLocation:true, dropLocation:true, pickupDateTime:true, status:true,
        tripType:true, estimatedFare:true, baseFare:true, finalFare:true,
        discountAmount:true, extraCharges:true, pricingPackageId:true, deletedAt:true
      }
    });
    if (!booking || booking.deletedAt) return NextResponse.json({success:false,message:"Booking not found."},{status:404});

    const [customers,vendors,vehicles,drivers,packages]=await Promise.all([
      prisma.customer.findMany({
        where:{deletedAt:null},
        select:{id:true,firstName:true,lastName:true,user:{select:{mobile:true,email:true,isActive:true}}},
        orderBy:[{firstName:"asc"},{lastName:"asc"}],take:500
      }),
      prisma.vendor.findMany({
        where:{deletedAt:null,isApproved:true},
        select:{id:true,companyName:true,user:{select:{mobile:true,email:true,isActive:true}}},
        orderBy:{companyName:"asc"},take:500
      }),
      prisma.vehicle.findMany({
        where:{deletedAt:null,isVerified:true,status:"AVAILABLE"},
        select:{id:true,vendorId:true,driverId:true,make:true,model:true,variant:true,registrationNumber:true,year:true,category:true,fuelType:true,transmission:true,seatingCapacity:true,luggageCapacity:true,color:true,status:true},
        orderBy:[{make:"asc"},{model:"asc"}],take:1000
      }),
      prisma.driver.findMany({
        where:{deletedAt:null,status:"ACTIVE"},
        select:{id:true,firstName:true,lastName:true,licenseNumber:true,status:true,user:{select:{mobile:true,email:true,isActive:true}},vehicles:{select:{vendorId:true}}},
        orderBy:[{firstName:"asc"},{lastName:"asc"}],take:1000
      }),
      prisma.pricingPackage.findMany({
        where:{isActive:true,vehicle:{deletedAt:null}},
        include:{pricingRule:{select:{pricingType:true,tripType:true,chargeType:true}},vehicle:{select:{id:true,vendorId:true,make:true,model:true,variant:true,registrationNumber:true}}},
        orderBy:{createdAt:"desc"},take:2000
      })
    ]);

    if (!vehicles.some(v=>v.id===booking.vehicleId)) {
      const current=await prisma.vehicle.findUnique({
        where:{id:booking.vehicleId},
        select:{id:true,vendorId:true,driverId:true,make:true,model:true,variant:true,registrationNumber:true,year:true,category:true,fuelType:true,transmission:true,seatingCapacity:true,luggageCapacity:true,color:true,status:true}
      });
      if(current) vehicles.unshift(current);
    }
    if (booking.driverId && !drivers.some(d=>d.id===booking.driverId)) {
      const current=await prisma.driver.findUnique({
        where:{id:booking.driverId},
        select:{id:true,firstName:true,lastName:true,licenseNumber:true,status:true,user:{select:{mobile:true,email:true,isActive:true}},vehicles:{select:{vendorId:true}}}
      });
      if(current) drivers.unshift(current);
    }

    return NextResponse.json({success:true,data:{
      booking,
      customers:customers.map(c=>({id:c.id,label:`${c.firstName} ${c.lastName}`.trim(),mobile:c.user.mobile,email:c.user.email,active:c.user.isActive})),
      vendors:vendors.map(v=>({id:v.id,label:v.companyName,mobile:v.user.mobile,email:v.user.email,active:v.user.isActive})),
      vehicles:vehicles.map(v=>({id:v.id,vendorId:v.vendorId,driverId:v.driverId,label:`${v.make} ${v.model}${v.variant?` ${v.variant}`:""} — ${v.registrationNumber}`,detail:`${v.category} • ${v.seatingCapacity} seats • ${v.fuelType} • ${v.transmission} • ${v.status}`,status:v.status,registrationNumber:v.registrationNumber,make:v.make,model:v.model,variant:v.variant,year:v.year,category:v.category,fuelType:v.fuelType,transmission:v.transmission,seatingCapacity:v.seatingCapacity,luggageCapacity:v.luggageCapacity,color:v.color})),
      drivers:drivers.map(d=>({id:d.id,vendorId:d.vehicles[0]?.vendorId||null,label:`${d.firstName} ${d.lastName}`.trim(),detail:`${d.licenseNumber} • ${d.user.mobile||"No mobile"} • ${d.status}`,mobile:d.user.mobile,email:d.user.email,status:d.status})),
      packages:packages.map(p=>({id:p.id,vehicleId:p.vehicleId,vendorId:p.vehicle.vendorId,label:p.packageName,packageType:p.packageType,pricingType:p.pricingRule.pricingType,tripType:p.pricingRule.tripType,chargeType:p.pricingRule.chargeType,city:p.city,fromCity:p.fromCity,toCity:p.toCity,airportName:p.airportName,transferDirection:p.transferDirection,includedHours:p.includedHours,includedKm:p.includedKm,baseFare:Number(p.baseFare),extraKmRate:p.extraKmRate==null?null:Number(p.extraKmRate),extraHourRate:p.extraHourRate==null?null:Number(p.extraHourRate),driverAllowance:p.driverAllowance==null?null:Number(p.driverAllowance),nightCharge:p.nightCharge==null?null:Number(p.nightCharge),tollCharge:p.tollCharge==null?null:Number(p.tollCharge),parkingCharge:p.parkingCharge==null?null:Number(p.parkingCharge),otherCharges:p.otherCharges==null?null:Number(p.otherCharges),extraPickupCharge:p.extraPickupCharge==null?null:Number(p.extraPickupCharge),extraDropCharge:p.extraDropCharge==null?null:Number(p.extraDropCharge)}))
    }});
  } catch(error) {
    console.error("GET /api/bookings/edit-options error:",error);
    return NextResponse.json({success:false,message:"Failed to load booking edit options."},{status:500});
  }
}
