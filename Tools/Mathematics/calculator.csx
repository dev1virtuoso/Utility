// Copyright © 2024 Carson. All rights reserved.
using System;

class Calculator
{
    static void Main()
    {
        Console.WriteLine("Welcome to the calculator!");

        while (true)
        {
            Console.WriteLine("\nEnter two numbers and an operator to perform the calculation, or enter 'q' to quit:");

            Console.Write("Number 1: ");
            string input1 = Console.ReadLine();

            if (input1 == "q")
                break;

            Console.Write("Number 2: ");
            string input2 = Console.ReadLine();

            if (input2 == "q")
                break;

            Console.Write("Operator (+, -, *, /): ");
            string op = Console.ReadLine();

            if (op == "q")
                break;

            double num1, num2;
            if (!double.TryParse(input1, out num1) || !double.TryParse(input2, out num2))
            {
                Console.WriteLine("Invalid input! Please enter valid numbers.");
                continue;
            }

            double result = 0;
            switch (op)
            {
                case "+":
                    result = num1 + num2;
                    break;
                case "-":
                    result = num1 - num2;
                    break;
                case "*":
                    result = num1 * num2;
                    break;
                case "/":
                    if (num2 == 0)
                    {
                        Console.WriteLine("Error: Division by zero is not allowed.");
                        continue;
                    }
                    result = num1 / num2;
                    break;
                default:
                    Console.WriteLine("Invalid operator! Please enter a valid operator.");
                    continue;
            }

            Console.WriteLine($"Result: {result}");
        }

        Console.WriteLine("Thank you for using the calculator!");
    }
}