"""
Seed script to populate the database with sample engines, transmissions, and vehicles.
Run with: python seed_data.py
"""
import asyncio
from app.database import async_session_maker, init_db
from app.models.engine import Engine
from app.models.transmission import Transmission
from app.models.vehicle import Vehicle
from app.models.vehicle import QualityStatus


async def seed_engines():
    """Add sample engine data."""
    engines = [
        Engine(
            make="Chevrolet",
            model="LS3",
            variant="6.2L",
            dimensions_h=25.0,
            dimensions_w=27.0,
            dimensions_l=27.5,
            weight=418,
            fuel_pressure_psi=58,
            fuel_flow_lph=227,
            cooling_btu_min=12000,
            power_hp=430,
            torque_lb_ft=424,
            mount_points={"front_left": [0, 0, 0], "front_right": [0, 0, 20]},
        ),
        Engine(
            make="Chevrolet",
            model="LS1",
            variant="5.7L",
            dimensions_h=24.0,
            dimensions_w=26.5,
            dimensions_l=27.0,
            weight=385,
            fuel_pressure_psi=58,
            fuel_flow_lph=190,
            cooling_btu_min=10000,
            power_hp=350,
            torque_lb_ft=365,
            mount_points={"front_left": [0, 0, 0], "front_right": [0, 0, 20]},
        ),
        Engine(
            make="Ford",
            model="Coyote",
            variant="5.0L Gen 3",
            dimensions_h=26.5,
            dimensions_w=28.0,
            dimensions_l=27.0,
            weight=444,
            fuel_pressure_psi=55,
            fuel_flow_lph=250,
            cooling_btu_min=13000,
            power_hp=460,
            torque_lb_ft=420,
            mount_points={"front_left": [0, 0, 0], "front_right": [0, 0, 22]},
        ),
        Engine(
            make="Toyota",
            model="2JZ-GTE",
            variant="3.0L Twin Turbo",
            dimensions_h=27.5,
            dimensions_w=24.0,
            dimensions_l=28.0,
            weight=505,
            fuel_pressure_psi=43,
            fuel_flow_lph=280,
            cooling_btu_min=15000,
            power_hp=320,
            torque_lb_ft=315,
            mount_points={"front_left": [0, 0, 0], "front_right": [0, 0, 18]},
        ),
        Engine(
            make="Nissan",
            model="RB26DETT",
            variant="2.6L Twin Turbo",
            dimensions_h=28.0,
            dimensions_w=23.0,
            dimensions_l=29.0,
            weight=545,
            fuel_pressure_psi=43,
            fuel_flow_lph=300,
            cooling_btu_min=14000,
            power_hp=280,
            torque_lb_ft=260,
            mount_points={"front_left": [0, 0, 0], "front_right": [0, 0, 17]},
        ),
        Engine(
            make="Dodge",
            model="HEMI",
            variant="6.4L 392",
            dimensions_h=27.0,
            dimensions_w=30.0,
            dimensions_l=27.0,
            weight=490,
            fuel_pressure_psi=58,
            fuel_flow_lph=240,
            cooling_btu_min=13500,
            power_hp=485,
            torque_lb_ft=475,
            mount_points={"front_left": [0, 0, 0], "front_right": [0, 0, 24]},
        ),
    ]
    return engines


async def seed_transmissions():
    """Add sample transmission data."""
    transmissions = [
        Transmission(
            make="Tremec",
            model="T56 Magnum",
            dimensions_h=12.0,
            dimensions_w=14.0,
            dimensions_l=26.4,
            weight=115,
            bellhousing_pattern="GM LS",
        ),
        Transmission(
            make="Tremec",
            model="TKX",
            dimensions_h=10.5,
            dimensions_w=12.5,
            dimensions_l=23.0,
            weight=75,
            bellhousing_pattern="GM LS",
        ),
        Transmission(
            make="Tremec",
            model="T56 Magnum-F",
            dimensions_h=12.0,
            dimensions_w=14.0,
            dimensions_l=26.4,
            weight=115,
            bellhousing_pattern="Ford Modular",
        ),
        Transmission(
            make="GM",
            model="4L60E",
            dimensions_h=10.0,
            dimensions_w=14.0,
            dimensions_l=21.9,
            weight=150,
            bellhousing_pattern="GM LS",
        ),
        Transmission(
            make="GM",
            model="4L80E",
            dimensions_h=11.0,
            dimensions_w=16.0,
            dimensions_l=24.6,
            weight=180,
            bellhousing_pattern="GM LS",
        ),
        Transmission(
            make="Toyota",
            model="R154",
            dimensions_h=11.5,
            dimensions_w=13.0,
            dimensions_l=24.0,
            weight=100,
            bellhousing_pattern="Toyota JZ",
        ),
        Transmission(
            make="Nissan",
            model="CD009",
            dimensions_h=11.0,
            dimensions_w=13.5,
            dimensions_l=25.0,
            weight=95,
            bellhousing_pattern="Nissan VQ/VH",
        ),
    ]
    return transmissions


async def seed_vehicles():
    """Add sample vehicle data."""
    vehicles = [
        Vehicle(
            year=1969,
            make="Chevrolet",
            model="Camaro",
            trim="SS",
            vin_pattern="124379",
            quality_status=QualityStatus.approved,
        ),
        Vehicle(
            year=1967,
            make="Ford",
            model="Mustang",
            trim="Fastback",
            vin_pattern="7F02C",
            quality_status=QualityStatus.approved,
        ),
        Vehicle(
            year=1970,
            make="Dodge",
            model="Challenger",
            trim="R/T",
            vin_pattern="JH23R0B",
            quality_status=QualityStatus.approved,
        ),
        Vehicle(
            year=1990,
            make="Mazda",
            model="Miata",
            trim="NA",
            vin_pattern="JM1NA35",
            quality_status=QualityStatus.approved,
        ),
        Vehicle(
            year=1989,
            make="Nissan",
            model="240SX",
            trim="SE",
            vin_pattern="JN1MS34",
            quality_status=QualityStatus.approved,
        ),
        Vehicle(
            year=1995,
            make="Toyota",
            model="Supra",
            trim="Turbo",
            vin_pattern="JT2JA82",
            quality_status=QualityStatus.approved,
        ),
        Vehicle(
            year=2005,
            make="Ford",
            model="Mustang",
            trim="GT",
            vin_pattern="1ZVFT82H",
            quality_status=QualityStatus.approved,
        ),
    ]
    return vehicles


async def main():
    print("Initializing database...")
    await init_db()

    async with async_session_maker() as session:
        # Add engines
        print("Seeding engines...")
        engines = await seed_engines()
        for engine in engines:
            session.add(engine)

        # Add transmissions
        print("Seeding transmissions...")
        transmissions = await seed_transmissions()
        for trans in transmissions:
            session.add(trans)

        # Add vehicles
        print("Seeding vehicles...")
        vehicles = await seed_vehicles()
        for vehicle in vehicles:
            session.add(vehicle)

        await session.commit()
        print(f"Seeded {len(engines)} engines, {len(transmissions)} transmissions, {len(vehicles)} vehicles")


if __name__ == "__main__":
    asyncio.run(main())
