class Calculator:
    def __init__(self, a: float, b: float):
        self.a = a
        self.b = b

    def get_sum(self) -> float:
        return self.a + self.b

    def get_product(self) -> float:
        return self.a * self.b

    def get_difference(self) -> float:
        return self.a - self.b

    def get_quotient(self) -> float:
        return self.a / self.b

n1 = 10
n2 = 20

example = Calculator(a = n1, b = n2)

print(f'{n1} + {n2} = {example.get_sum()}')
print(f'{n1} * {n2} = {example.get_product()}')
print(f'{n1} - {n2} = {example.get_difference()}')
print(f'{n1} / {n2} = {example.get_quotient()}')

