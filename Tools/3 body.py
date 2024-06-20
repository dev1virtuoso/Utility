# Copyright © 2024 Carson. All rights reserved.

import pygame
import math

# Initialize Pygame
pygame.init()

# Set window size
width, height = 800, 600
screen = pygame.display.set_mode((width, height))
pygame.display.set_caption("Three-Body Simulation")

# Define colors
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)

# Define initial positions, velocities, and masses of three planets
planet1_pos = [width // 4, height // 2]
planet1_vel = [0, 0]
planet1_mass = 5000

planet2_pos = [width // 2, height // 2]
planet2_vel = [0, 0]
planet2_mass = 3000

planet3_pos = [3 * width // 4, height // 2]
planet3_vel = [0, 0]
planet3_mass = 2000

# Define time step and acceleration factor
time_step = 0.1
acceleration = 1

clock = pygame.time.Clock()

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # Clear the screen
    screen.fill(BLACK)

    # Update the positions and velocities of the planets
    distance_12 = math.sqrt((planet2_pos[0] - planet1_pos[0]) ** 2 + (planet2_pos[1] - planet1_pos[1]) ** 2)
    distance_13 = math.sqrt((planet3_pos[0] - planet1_pos[0]) ** 2 + (planet3_pos[1] - planet1_pos[1]) ** 2)
    distance_23 = math.sqrt((planet3_pos[0] - planet2_pos[0]) ** 2 + (planet3_pos[1] - planet2_pos[1]) ** 2)

    force_12 = acceleration * planet2_mass / (distance_12 ** 2)
    force_21 = acceleration * planet1_mass / (distance_12 ** 2)
    force_13 = acceleration * planet3_mass / (distance_13 ** 2)
    force_31 = acceleration * planet1_mass / (distance_13 ** 2)
    force_23 = acceleration * planet3_mass / (distance_23 ** 2)
    force_32 = acceleration * planet2_mass / (distance_23 ** 2)

    planet1_vel[0] += force_12 * (planet2_pos[0] - planet1_pos[0]) / distance_12 * time_step
    planet1_vel[1] += force_13 * (planet3_pos[0] - planet1_pos[0]) / distance_13 * time_step
    planet1_pos[0] += planet1_vel[0] * time_step
    planet1_pos[1] += planet1_vel[1] * time_step

    planet2_vel[0] -= force_12 * (planet2_pos[0] - planet1_pos[0]) / distance_12 * time_step
    planet2_vel[1] += force_23 * (planet3_pos[0] - planet2_pos[0]) / distance_23 * time_step
    planet2_pos[0] += planet2_vel[0] * time_step
    planet2_pos[1] += planet2_vel[1] * time_step

    planet3_vel[0] -= force_13 * (planet3_pos[0] - planet1_pos[0]) / distance_13 * time_step
    planet3_vel[1] -= force_23 * (planet3_pos[0] - planet2_pos[0]) / distance_23 * time_step
    planet3_pos[0] += planet3_vel[0] * time_step
    planet3_pos[1] += planet3_vel[1] * time_step

    # Draw the planets
    pygame.draw.circle(screen, RED, (int(planet1_pos[0]), int(planet1_pos[1])), 10)
    pygame.draw.circle(screen, GREEN, (int(planet2_pos[0]), int(planet2_pos[1])), 10)
    pygame.draw.circle(screen, BLUE, (int(planet3_pos[0]), int(planet3_pos[1])), 10)

    # Update the screen
    pygame.display.flip()