class Book:
    def __init__(self, name, author, publication_year):
        self.name = name
        self.author = author
        self.publication_year = publication_year

class Library:
    def __init__(self):
        self.books = []

    def add_book(self, book: Book):
        self.books.append(book)

    def remove_book(self, book: Book):
        self.books.remove(book)

    def remove_book_by_name(self, name):
        for book in self.books:
            if book.name == name:
                self.books.remove(book)
                return True
        return False

    def print_books(self):
        if len(self.books) == 0:
            print("No books found")
            return

        for book in self.books:
            print(f'{book.name} by {book.author}, published in {book.publication_year}')


book1 = Book('Cat`s Cradle', 'Kurt Vonnegut', 1963)
book2 = Book('No Country for Old Men', 'Cormac  McCarthy', 2005)
book3 = Book("The Trial", "Franz Kafka", 1925)

my_lib = Library()

my_lib.add_book(book1)
my_lib.add_book(book2)
my_lib.add_book(book3)

print("Library before removal:")
my_lib.print_books()

my_lib.remove_book_by_name("The Trial")
my_lib.remove_book(book2)

print("\nLibrary after removal:")
my_lib.print_books()
