"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/use-toast";

interface Article {
  article_id: string;
  title: string;
  content: string;
  image_url: string;
  is_real: boolean;
  reason?: string;
  category: string;
  created_at: string;
  player_views?: number;
}

export default function NewsManagement() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "real" | "fake">("all");
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isCreatingArticle, setIsCreatingArticle] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const { toast } = useToast();
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(
    new Set()
  );
  const [stats, setStats] = useState({
    totalArticles: 0,
    realNewsCount: 0,
    fakeNewsCount: 0,
    viewedArticles: 0,
    unviewedArticles: 0,
  });
  const [totalPages, setTotalPages] = useState(1);

  // Fields for editing
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isReal, setIsReal] = useState(false);
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("general");

  // Fake news types from the about page
  const fakeNewsTypes = [
    "False Claims",
    "Misleading Headlines",
    "Out of Context",
    "Satire or Parody",
    "Impersonation",
    "Manipulated Content",
    "Conspiracy Theory",
  ];

  useEffect(() => {
    fetchArticles();
    fetchStats();
  }, [filter, page, search]);

  async function fetchStats() {
    try {
      // Get total articles count
      const { count: totalCount, error: totalError } = await supabase
        .from("news_articles")
        .select("*", { count: "exact", head: true });

      // Get real news count
      const { count: realCount, error: realError } = await supabase
        .from("news_articles")
        .select("*", { count: "exact", head: true })
        .eq("is_real", true);

      // Get fake news count
      const { count: fakeCount, error: fakeError } = await supabase
        .from("news_articles")
        .select("*", { count: "exact", head: true })
        .eq("is_real", false);

      // Get articles that have been viewed (appear in game_sessions)
      const { data: viewedData, error: viewedError } = await supabase
        .from("game_sessions")
        .select("article_id")
        .limit(1000);

      // Count unique viewed articles
      const viewedArticleIds = new Set();
      if (viewedData) {
        viewedData.forEach((session: any) => {
          if (session.article_id) {
            viewedArticleIds.add(session.article_id);
          }
        });
      }

      setStats({
        totalArticles: totalCount || 0,
        realNewsCount: realCount || 0,
        fakeNewsCount: fakeCount || 0,
        viewedArticles: viewedArticleIds.size,
        unviewedArticles: (totalCount || 0) - viewedArticleIds.size,
      });
    } catch (error) {
      console.error("Error fetching article stats:", error);
    }
  }

  async function fetchArticles() {
    setLoading(true);
    try {
      // First get the total count for pagination
      let countQuery = supabase
        .from("news_articles")
        .select("*", { count: "exact", head: true });

      // Apply filter to count query
      if (filter === "real") {
        countQuery = countQuery.eq("is_real", true);
      } else if (filter === "fake") {
        countQuery = countQuery.eq("is_real", false);
      }

      // Apply search to count query if provided
      if (search) {
        countQuery = countQuery.or(
          `title.ilike.%${search}%,content.ilike.%${search}%,category.ilike.%${search}%`
        );
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error("Error fetching article count:", countError);
      } else {
        // Calculate total pages
        const total = count || 0;
        const pages = Math.max(1, Math.ceil(total / pageSize));
        setTotalPages(pages);

        // Adjust current page if it's out of bounds
        if (page >= pages && pages > 0) {
          setPage(pages - 1);
          return; // Exit early as the page state change will trigger a re-fetch
        }
      }

      // Now fetch the articles for the current page
      let query = supabase.from("news_articles").select("*");

      // Apply filter
      if (filter === "real") {
        query = query.eq("is_real", true);
      } else if (filter === "fake") {
        query = query.eq("is_real", false);
      }

      // Apply search if provided
      if (search) {
        query = query.or(
          `title.ilike.%${search}%,content.ilike.%${search}%,category.ilike.%${search}%`
        );
      }

      // Apply pagination
      query = query
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching articles:", error);
      } else {
        setArticles(data || []);
      }
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(article: Article) {
    setIsCreatingArticle(false);
    setEditingArticle(article);
    setTitle(article.title);
    setContent(article.content);
    setImageUrl(article.image_url || "");
    setIsReal(article.is_real);
    setReason(article.reason || "");
    setCategory(article.category);
  }

  function handleCreateNew() {
    setEditingArticle(null);
    setIsCreatingArticle(true);
    // Set default values for new article
    setTitle("");
    setContent("");
    setImageUrl("");
    setIsReal(false);
    setReason("");
    setCategory("general");
  }

  // Handle single article deletion with improved error handling
  async function handleDelete(articleId: string) {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      setLoading(true);

      // First check if this article is used in any game sessions
      const { count, error: countError } = await supabase
        .from("game_sessions")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleId);

      if (countError) {
        console.error("Error checking game sessions:", countError);
      }

      // If the article is used in game sessions, show a warning
      if (count && count > 0) {
        const forceDelete = confirm(
          `This article has been used in ${count} game sessions. Delete anyway? (This may affect user game history)`
        );

        if (!forceDelete) {
          setLoading(false);
          return;
        }

        // If forcing deletion, first delete related game sessions
        const { error: sessionDeleteError } = await supabase
          .from("game_sessions")
          .delete()
          .eq("article_id", articleId);

        if (sessionDeleteError) {
          console.error(
            "Error deleting related game sessions:",
            sessionDeleteError
          );
          toast({
            title: "Error",
            description:
              "Failed to delete related game data. Cannot delete article.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Now delete the article
      const { error } = await supabase
        .from("news_articles")
        .delete()
        .eq("article_id", articleId);

      if (error) {
        console.error("Error deleting article:", error);
        toast({
          title: "Error",
          description: `Failed to delete article: ${
            error.message || "Unknown error"
          }`,
          variant: "destructive",
        });
      } else {
        setArticles(articles.filter((a) => a.article_id !== articleId));
        toast({
          title: "Success",
          description: "Article deleted successfully",
        });
        fetchStats(); // Refresh stats after deletion
      }
    } catch (error) {
      console.error("Error deleting article:", error);
      toast({
        title: "Error",
        description: "Failed to delete article due to an unexpected error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (isCreatingArticle) {
      // Creating a new article
      try {
        // Generate a unique ID for the new article
        const newArticleId = crypto.randomUUID();

        const { error } = await supabase.from("news_articles").insert({
          article_id: newArticleId,
          title,
          content,
          image_url: imageUrl || null,
          is_real: isReal,
          reason: isReal ? null : reason,
          category,
          created_at: new Date().toISOString(),
          player_views: 0,
        });

        if (error) {
          console.error("Error creating article:", error);
          toast({
            title: "Error",
            description: "Failed to create article: " + error.message,
            variant: "destructive",
          });
        } else {
          setIsCreatingArticle(false);
          toast({
            title: "Success",
            description: "Article created successfully",
          });
          fetchArticles();
          fetchStats();
        }
      } catch (error) {
        console.error("Error creating article:", error);
        toast({
          title: "Error",
          description: "Failed to create article due to an unexpected error",
          variant: "destructive",
        });
      }
      return;
    }

    // Updating an existing article
    if (!editingArticle) return;

    try {
      const { error } = await supabase
        .from("news_articles")
        .update({
          title,
          content,
          image_url: imageUrl,
          is_real: isReal,
          reason: isReal ? null : reason,
          category,
        })
        .eq("article_id", editingArticle.article_id);

      if (error) {
        console.error("Error updating article:", error);
        toast({
          title: "Error",
          description: "Failed to update article: " + error.message,
          variant: "destructive",
        });
      } else {
        setEditingArticle(null);
        fetchArticles();
        fetchStats(); // Refresh stats after update
        toast({
          title: "Success",
          description: "Article updated successfully",
        });
      }
    } catch (error) {
      console.error("Error updating article:", error);
      toast({
        title: "Error",
        description: "Failed to update article due to an unexpected error",
        variant: "destructive",
      });
    }
  }

  // Filter articles based on search term - no longer needed as we're filtering on the server side
  const filteredArticles = articles;

  // Export articles to JSON
  async function exportArticles() {
    setLoading(true);
    try {
      // Fetch all articles regardless of current filter
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching articles for export:", error);
        toast({
          title: "Error",
          description: "Failed to export articles",
          variant: "destructive",
        });
        return;
      }

      if (!data || data.length === 0) {
        toast({
          title: "No Articles",
          description: "There are no articles to export",
          variant: "destructive",
        });
        return;
      }

      // Create a JSON blob and trigger download
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      saveAs(blob, `fakeout-articles-${timestamp}.json`);

      toast({
        title: "Export Successful",
        description: `Exported ${data.length} articles to JSON`,
      });
    } catch (error) {
      console.error("Error exporting articles:", error);
      toast({
        title: "Error",
        description: "Failed to export articles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // Import articles from JSON
  async function importArticles(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    setLoading(true);

    try {
      // Read the file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const articles = JSON.parse(e.target?.result as string);

          if (!Array.isArray(articles)) {
            toast({
              title: "Invalid Format",
              description: "The JSON file must contain an array of articles",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          // Validate each article (basic validation)
          const validArticles = articles.filter(
            (article) =>
              article &&
              typeof article === "object" &&
              "title" in article &&
              "content" in article &&
              "is_real" in article
          );

          if (validArticles.length === 0) {
            toast({
              title: "Invalid Articles",
              description: "No valid articles found in the imported file",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          // Prepare articles for insertion
          const articlesToInsert = validArticles.map((article) => {
            // Ensure we have article_id and other required fields
            // If article_id exists, it will be used (potentially overwriting existing articles)
            // If not, Supabase will generate a new UUID
            return {
              article_id: article.article_id || undefined,
              title: article.title,
              content: article.content,
              image_url: article.image_url || null,
              is_real: article.is_real,
              reason: article.reason || null,
              category: article.category || "general",
              created_at: article.created_at || new Date().toISOString(),
            };
          });

          // Insert articles into the database
          const { error } = await supabase
            .from("news_articles")
            .upsert(articlesToInsert, {
              onConflict: "article_id", // Update if the article_id already exists
              ignoreDuplicates: false,
            });

          if (error) {
            console.error("Error importing articles:", error);
            toast({
              title: "Import Error",
              description: `Failed to import articles: ${error.message}`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Import Successful",
              description: `Imported ${articlesToInsert.length} articles`,
            });
            // Refresh the articles list and stats
            fetchArticles();
            fetchStats();
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);
          toast({
            title: "Invalid JSON",
            description: "The selected file contains invalid JSON",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
          // Reset the file input
          event.target.value = "";
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error("Error reading file:", error);
      toast({
        title: "Error",
        description: "Failed to read the selected file",
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  // Handle toggle for single article selection
  const toggleArticleSelection = (articleId: string) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId);
    } else {
      newSelected.add(articleId);
    }
    setSelectedArticles(newSelected);
  };

  // Handle "Select All" functionality for current page
  const toggleSelectAll = () => {
    if (selectedArticles.size === filteredArticles.length) {
      // If all are selected, deselect all
      setSelectedArticles(new Set());
    } else {
      // Otherwise, select all visible articles
      const newSelected = new Set<string>();
      filteredArticles.forEach((article) =>
        newSelected.add(article.article_id)
      );
      setSelectedArticles(newSelected);
    }
  };

  // Handle bulk deletion of selected articles with improved error handling
  const handleBulkDelete = async () => {
    if (selectedArticles.size === 0) {
      toast({
        title: "No Articles Selected",
        description: "Please select at least one article to delete",
        variant: "destructive",
      });
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedArticles.size} selected article(s)?`
      )
    ) {
      return;
    }

    setLoading(true);

    // Track articles with foreign key constraints
    interface ArticleWithReferences {
      id: string;
      title: string;
      sessionCount: number;
      error?: string;
    }

    const articlesWithReferences: ArticleWithReferences[] = [];
    let forceDeleteAll = false;

    try {
      // Convert Set to Array for the delete operation
      const articleIds = Array.from(selectedArticles);

      // First check which articles have game sessions
      for (const articleId of articleIds) {
        const { count, error: countError } = await supabase
          .from("game_sessions")
          .select("*", { count: "exact", head: true })
          .eq("article_id", articleId);

        if (count && count > 0) {
          articlesWithReferences.push({
            id: articleId,
            title:
              articles.find((a) => a.article_id === articleId)?.title ||
              "Unknown",
            sessionCount: count,
          });
        }
      }

      // If any articles have references, ask for confirmation to force delete
      if (articlesWithReferences.length > 0) {
        const articlesList = articlesWithReferences
          .map((a) => `- ${a.title} (${a.sessionCount} sessions)`)
          .join("\n");

        forceDeleteAll = confirm(
          `${articlesWithReferences.length} articles have been used in game sessions:\n\n${articlesList}\n\nForce delete these articles? (This will also delete related game history)`
        );

        if (forceDeleteAll) {
          // Delete all related game sessions first
          for (const article of articlesWithReferences) {
            const { error: sessionDeleteError } = await supabase
              .from("game_sessions")
              .delete()
              .eq("article_id", article.id);

            if (sessionDeleteError) {
              console.error(
                `Error deleting sessions for article ${article.id}:`,
                sessionDeleteError
              );
            }
          }
        } else {
          // Remove referenced articles from the deletion list
          const articlesToDelete = articleIds.filter(
            (id) => !articlesWithReferences.some((a) => a.id === id)
          );

          if (articlesToDelete.length === 0) {
            toast({
              title: "Operation Cancelled",
              description:
                "No articles were deleted. Remove articles from game sessions first or use force delete.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          // Update the articleIds array to only include articles without references
          articleIds.length = 0;
          articleIds.push(...articlesToDelete);

          toast({
            title: "Partial Operation",
            description: `Will only delete ${articlesToDelete.length} articles that aren't used in games.`,
          });
        }
      }

      // Track success and failures
      let successCount = 0;
      let errorCount = 0;
      const failedArticles: ArticleWithReferences[] = [];

      // Delete remaining articles one by one
      for (const articleId of articleIds) {
        const { error } = await supabase
          .from("news_articles")
          .delete()
          .eq("article_id", articleId);

        if (error) {
          console.error(`Error deleting article ${articleId}:`, error);
          errorCount++;
          failedArticles.push({
            id: articleId,
            title:
              articles.find((a) => a.article_id === articleId)?.title ||
              "Unknown",
            sessionCount: 0,
            error: error.message,
          });
        } else {
          successCount++;
        }
      }

      // Show appropriate message based on results
      if (errorCount > 0) {
        const failedList = failedArticles
          .map((a) => `- ${a.title}: ${a.error}`)
          .join("\n");

        toast({
          title: "Partial Success",
          description: `Deleted ${successCount} articles, but ${errorCount} failed. See console for details.`,
          variant: "destructive",
        });

        console.error("Failed to delete these articles:", failedList);
      } else {
        // Update local articles state by filtering out deleted ones
        setArticles(
          articles.filter((a) => !selectedArticles.has(a.article_id))
        );
        toast({
          title: "Success",
          description: `Successfully deleted ${successCount} article(s)`,
        });
      }

      // Clear selection and refresh stats
      setSelectedArticles(new Set());
      fetchStats();
    } catch (error) {
      console.error("Error in bulk delete:", error);
      toast({
        title: "Deletion Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">News Articles Management</h2>

      {/* Import/Export Instructions */}
      <Card className="p-4 mb-6 bg-blue-50">
        <h3 className="text-lg font-medium mb-2">Import/Export Articles</h3>
        <p className="text-sm text-gray-700 mb-2">
          • <strong>Export JSON</strong>: Download all articles from the
          database as a JSON file for backup or transfer.
        </p>
        <p className="text-sm text-gray-700">
          • <strong>Import JSON</strong>: Upload a JSON file containing articles
          to add them to the database. Articles with existing IDs will be
          updated.
        </p>
      </Card>

      {/* Statistics Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Article Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {stats.totalArticles}
            </div>
            <div className="text-sm text-gray-600">1. Total Articles</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats.realNewsCount}
            </div>
            <div className="text-sm text-gray-600">2. Real News</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {stats.fakeNewsCount}
            </div>
            <div className="text-sm text-gray-600">3. Fake News</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {stats.viewedArticles}
            </div>
            <div className="text-sm text-gray-600">4. Articles Viewed</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-gray-600 mb-2">
              {stats.unviewedArticles}
            </div>
            <div className="text-sm text-gray-600">
              5. Articles Never Viewed
            </div>
          </Card>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Search articles..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0); // Reset to first page on search
          }}
          className="md:w-1/3"
        />

        <div className="flex space-x-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => {
              setFilter("all");
              setPage(0);
            }}
          >
            All
          </Button>
          <Button
            variant={filter === "real" ? "default" : "outline"}
            onClick={() => {
              setFilter("real");
              setPage(0);
            }}
          >
            Real News
          </Button>
          <Button
            variant={filter === "fake" ? "default" : "outline"}
            onClick={() => {
              setFilter("fake");
              setPage(0);
            }}
          >
            Fake News
          </Button>
        </div>

        {/* Add Export/Import/Create buttons */}
        <div className="flex space-x-2 ml-auto">
          <Button
            onClick={handleCreateNew}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={loading}
          >
            Create New Article
          </Button>

          <Button variant="outline" onClick={exportArticles} disabled={loading}>
            Export JSON
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              onClick={() => document.getElementById("import-json")?.click()}
              disabled={loading}
            >
              Import JSON
            </Button>
            <input
              id="import-json"
              type="file"
              accept="application/json"
              onChange={importArticles}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading articles...</div>
      ) : (
        <>
          {editingArticle || isCreatingArticle ? (
            <Card className="p-4 mb-6">
              <h3 className="text-xl font-medium mb-4">
                {isCreatingArticle ? "Create New Article" : "Edit Article"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Title
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter article title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full border rounded-md p-2 min-h-[150px]"
                    placeholder="Enter article content (can include HTML tags)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Image URL
                  </label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Category
                  </label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., politics, technology, health, etc."
                  />
                </div>

                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    checked={isReal}
                    onChange={(e) => setIsReal(e.target.checked)}
                    className="h-4 w-4 text-blue-600 mr-2"
                  />
                  <label>Is Real News</label>
                </div>

                {!isReal && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Fake News Reason
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">Select a reason</option>
                      {fakeNewsTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex space-x-4 mt-6">
                  <Button onClick={handleSave}>
                    {isCreatingArticle ? "Create Article" : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingArticle(null);
                      setIsCreatingArticle(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredArticles.length === 0 ? (
                <div className="text-center py-8">No articles found</div>
              ) : (
                <>
                  {/* Add bulk actions toolbar */}
                  <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 mr-2"
                        checked={
                          selectedArticles.size === filteredArticles.length &&
                          filteredArticles.length > 0
                        }
                        onChange={toggleSelectAll}
                      />
                      <span className="text-sm font-medium">
                        {selectedArticles.size} selected
                      </span>
                    </div>
                    {selectedArticles.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                      >
                        Delete Selected
                      </Button>
                    )}
                  </div>

                  {filteredArticles.map((article) => (
                    <Card key={article.article_id} className="p-4">
                      <div className="flex justify-between">
                        <div className="flex">
                          <div className="mr-3 flex items-start pt-1">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600"
                              checked={selectedArticles.has(article.article_id)}
                              onChange={() =>
                                toggleArticleSelection(article.article_id)
                              }
                            />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium">
                              {article.title}
                            </h3>
                            <p className="text-sm text-gray-500 mb-2">
                              Category: {article.category} |
                              {article.is_real
                                ? " Real News"
                                : ` Fake News (${article.reason})`}{" "}
                              | Created:{" "}
                              {new Date(
                                article.created_at
                              ).toLocaleDateString()}{" "}
                              | Views:{" "}
                              <span className="font-medium">
                                {article.player_views || 0}
                              </span>
                            </p>
                            <p className="line-clamp-3">{article.content}</p>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2">
                          <Button size="sm" onClick={() => handleEdit(article)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(article.article_id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              )}

              <div className="flex justify-between items-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPage(page - 1);
                    setSelectedArticles(new Set()); // Clear selections on page change
                  }}
                  disabled={page === 0}
                >
                  Previous
                </Button>

                <div className="flex items-center space-x-2">
                  <span className="text-sm">
                    Page {page + 1} of {totalPages}
                  </span>

                  {/* Jump to page select */}
                  {totalPages > 2 && (
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={page}
                      onChange={(e) => {
                        setPage(Number(e.target.value));
                        setSelectedArticles(new Set());
                      }}
                    >
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <option key={i} value={i}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  )}

                  <span className="text-xs text-gray-500">
                    {articles.length} of {stats.totalArticles} articles
                  </span>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setPage(page + 1);
                    setSelectedArticles(new Set()); // Clear selections on page change
                  }}
                  disabled={
                    page >= totalPages - 1 || articles.length < pageSize
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
