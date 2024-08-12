import sys
import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *
import math
import numpy as np

# Initialize Pygame
pygame.init()
display = (800, 600)
pygame.display.set_mode(display, DOUBLEBUF | OPENGL)
pygame.display.set_caption("Tornado Simulator")

# Initialize OpenGL
glMatrixMode(GL_PROJECTION)
glLoadIdentity()
gluPerspective(45, (display[0] / display[1]), 0.1, 50.0)  # Set up perspective projection
glMatrixMode(GL_MODELVIEW)

# Initialize font
pygame.font.init()
font = pygame.font.SysFont('Arial', 24)

# Define a class for a tornado
class Tornado:
    def __init__(self, diameter, rotation_speed, pressure_diff, fujita_rating, deformation_force):
        self.diameter = diameter
        self.rotation_speed = rotation_speed
        self.pressure_diff = pressure_diff
        self.fujita_rating = fujita_rating
        self.deformation_force = deformation_force
        self.position = np.array([0, 0, 0])  # Initialize position at (0, 0, 0)

    def update(self):
        self.rotation_speed += 0.1
        self.diameter += 0.05

        new_x = math.sin(math.radians(self.rotation_speed)) * 5
        new_y = math.cos(math.radians(self.rotation_speed)) * 5

        self.position = np.array([new_x, new_y, 0])

    def draw(self):
        num_circles = 10  # Define the number of circles to draw
        circle_radius = self.diameter  # Initial circle radius is the tornado's diameter
        
        for _ in range(num_circles):
            glPushMatrix()
            glTranslatef(self.position[0], self.position[1], self.position[2])
            
            quadric = gluNewQuadric()
            gluQuadricDrawStyle(quadric, GLU_FILL)
            glColor3f(0.5, 0.5, 0.5)
            
            gluDisk(quadric, circle_radius - 0.5, circle_radius + 0.5, 20, 1)  # Draw disk
            
            gluDeleteQuadric(quadric)
            
            glPopMatrix()
            
            circle_radius += 1.5  # Adjust the radius for the next circle

# Create a tornado object
tornado = Tornado(diameter=10, rotation_speed=5, pressure_diff=100, fujita_rating="EF3", deformation_force=20)

while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)

    # Set camera position and look-at point
    gluLookAt(0, 0, 10, 0, 0, 0, 0, 1, 0)

    tornado.update()  # Update tornado position
    tornado.draw()  # Draw tornado

    # Display diameter and rotation speed
    diameter_text = font.render(f'Diameter: {tornado.diameter}', True, (255, 255, 255))
    rotation_speed_text = font.render(f'Rotation Speed: {tornado.rotation_speed}', True, (255, 255, 255))
    
    # Draw diameter text with border, placed in the top right corner
    diameter_text = font.render(f'Diameter: {tornado.diameter}', True, (255, 255, 255))
    diameter_text_pos = diameter_text.get_rect(topleft=(display[0] - diameter_text.get_width() - 10, 10))
    
    text_width = diameter_text.get_width()
    text_height = diameter_text.get_height()
    
    pygame.draw.rect(pygame.display.get_surface(), (255, 255, 255), (display[0] - text_width - 20, 10, text_width + 10, text_height + 5))
    pygame.display.get_surface().blit(diameter_text, diameter_text_pos)
    
    # Draw rotation speed text with border, placed in the top right corner
    rotation_speed_text = font.render(f'Rotation Speed: {tornado.rotation_speed}', True, (255, 255, 255))
    rotation_speed_text_pos = rotation_speed_text.get_rect(topleft=(display[0] - rotation_speed_text.get_width() - 10, 40))
    
    text_width = rotation_speed_text.get_width()
    text_height = rotation_speed_text.get_height()
    
    pygame.draw.rect(pygame.display.get_surface(), (255, 255, 255), (display[0] - text_width - 20, 40, text_width + 10, text_height + 5))
    pygame.display.get_surface().blit(rotation_speed_text, rotation_speed_text_pos)

    pygame.display.flip()
    pygame.time.wait(10)
