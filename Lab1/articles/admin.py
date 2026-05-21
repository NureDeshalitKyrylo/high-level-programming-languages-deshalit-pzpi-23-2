from django.contrib import admin
from .models import Category, Article, Comment


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "article_count")
    search_fields = ("name",)

    def article_count(self, obj):
        return obj.articles.count()
    article_count.short_description = "Статей"


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 1
    readonly_fields = ("created_at",)
    fields = ("author", "text", "created_at")


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "published_at", "comment_count")
    list_filter = ("category", "published_at")
    search_fields = ("title", "text")
    readonly_fields = ("published_at",)
    inlines = [CommentInline]
    fieldsets = (
        (None, {"fields": ("title", "category", "text", "published_at")}),
    )

    def comment_count(self, obj):
        return obj.comments.count()
    comment_count.short_description = "Коментарі"


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("author", "article", "created_at")
    list_filter = ("created_at",)
    search_fields = ("author", "text")
    readonly_fields = ("created_at",)
