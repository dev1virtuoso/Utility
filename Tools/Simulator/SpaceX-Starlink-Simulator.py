import pygame
import math

pygame.init()

width, height = 800, 600
screen = pygame.display.set_mode((width, height))
pygame.display.set_caption("SpaceX Starlink Simulator")

class Satellite:
    def __init__(self, height, inclination, num_per_orbit, start_date):
        self.height = height
        self.inclination = inclination
        self.num_per_orbit = num_per_orbit
        self.start_date = start_date
        self.angle = 0
        self.distance = 250
        self.speed = 0.01

    def update(self):
        self.angle += self.speed

    def draw(self):
        x = width // 2 + self.distance * math.cos(self.angle)
        y = height // 2 + self.distance * math.sin(self.angle)
        pygame.draw.circle(screen, (255, 255, 255), (int(x), int(y)), 2)

satellites = [
    Satellite(550, 53.0, 72, "August 1, 2022"),
    Satellite(540, 53.2, 72, "October 10, 2022"),
    Satellite(570, 70, 36, ""),
    Satellite(560, 97.6, 6, ""),
    Satellite(172, 4, 43, "")
]

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    screen.fill((0, 0, 0))

    font = pygame.font.SysFont('Arial', 20)
    date_text = font.render(satellites[0].start_date, True, (255, 255, 255))
    screen.blit(date_text, (10, 10))

    for satellite in satellites:
        satellite.update()
        satellite.draw()

    pygame.display.flip()

pygame.quit()