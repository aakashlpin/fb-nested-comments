var inputData = [{
  pageId: '18807449704',
  postId: '10152662273199705'
}, {
  pageId: '18807449704',
  postId: '10152669896689705'
}];

function frameRequest(req) {
  return req + '?access_token=903855596296764|dhg-U21_XWTExPLl00bhNuE3HDw';
}

window.fbAsyncInit = function() {
  FB.init({
    appId      : '903855596296764',
    xfbml      : true,
    version    : 'v2.0'
  });

  processAllPages(inputData);
};

var processedData = {};

function processAllPages(pages) {
  async.each(pages, processPage, function(err) {
    if (err) {
      console.log(err);
      return;
    }
    //on successfully processing all pages, start processing all posts
    processAllPosts(inputData);
  });
}

function processPage(page, eachCb) {
  FB.api(
    frameRequest(page.pageId),
    function(response) {
      if (!response || response.error) {
        eachCb(response.error);
        return;
      }
      processedData[page.pageId] = {
        page_name: response.name,
        page_link: response.link
      };

      eachCb(null);
    }
  )
}

function processAllPosts(posts) {
  async.each(posts, processPost, function(err) {
    if (err) {
      console.log(err);
    }

    console.log(processedData);
  });
}

function processPost(post, eachCb) {
  FB.api(
      frameRequest(post.postId),
      function (response) {
        if (!response || response.error) {
          eachCb(response.error);
          return;
        }

        //for each comment, get the commentId, make another OG call to get nested comments recursively until data returned is empty array
        async.each(
            response.comments.data,
            function(comment, nestedEachCb) {
                FB.api(
                    frameRequest(comment.id + '/comments'),
                    function(response) {
                        if (!response || response.error) {
                          nestedEachCb(response.error);
                          return;
                        }
                        comment.comments = response.data;
                        nestedEachCb(null);
                    }
                );
            },
            function(err) {
              if (err) {
                eachCb(err);
                return;
              }

              processedData[post.pageId]["posts"] = processedData[post.pageId]["posts"] || [];
              processedData[post.pageId]["posts"].push(response);
              eachCb(null);
            }
        );
      }
  );
}