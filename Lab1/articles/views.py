from django.shortcuts import render, get_object_or_404, redirect
from django.core.paginator import Paginator
from django.db.models import Q
from .models import Article, Category, Comment


def article_list(request):
    qs = Article.objects.select_related("category")
    query = request.GET.get("q", "").strip()
    category_id = request.GET.get("category", "")

    if query:
        qs = qs.filter(Q(title__icontains=query) | Q(text__icontains=query))
    if category_id:
        qs = qs.filter(category_id=category_id)

    paginator = Paginator(qs, 5)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    categories = Category.objects.all()
    return render(request, "articles/article_list.html", {
        "page_obj": page_obj,
        "categories": categories,
        "query": query,
        "selected_category": category_id,
    })


def article_detail(request, pk):
    article = get_object_or_404(Article.objects.select_related("category"), pk=pk)
    comments = article.comments.all()
    error = None

    if request.method == "POST":
        author = request.POST.get("author", "").strip()
        text = request.POST.get("text", "").strip()
        if author and text:
            Comment.objects.create(article=article, author=author, text=text)
            return redirect("articles:detail", pk=pk)
        else:
            error = "Будь ласка, заповніть всі поля."

    return render(request, "articles/article_detail.html", {
        "article": article,
        "comments": comments,
        "error": error,
    })
