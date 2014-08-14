(function($, window) {
	var inputData;

	function frameRequest(req) {
	  return req + '?access_token=' + window.userAccessToken;
	}

	window.fbAsyncInit = function() {
		console.log('fbAsyncInit');
	  FB.init({
	    appId      : inputData.appId,
	    xfbml      : true,
	    version    : 'v2.0'
	  });

	  FB.getLoginStatus(function(response) {
	    if (response.status === 'connected') {
	      console.log('Logged in.');
	      initApp();
	      // replyToComment();
	    }
	    else {
	      $('#fbLogin').removeClass('hide');
	    }
	  });
	};

	function replyToComment() {
	  FB.api(
	    "/1448481268760001_1448481912093270/comments?access_token=" + window.userAccessToken,
	    "POST",
	    {
	      "message": "I love starbucks for that!"
	    },
	    function(response) {
	      if (response && !response.error) {
	        var commentId = response.id;
	        //Do whatever you wish to with this comment
	      }
	    }
	  );
	}

	var processedData = {};

	function processAllPages(pages) {
	  async.each(pages, processPage, function(err) {
	    if (err) {
	      console.log(err);
	      return;
	    }
	    //on successfully processing all pages, start processing all posts
	    processAllPosts(inputData.items);
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

	function getAccessTokenForUser() {
	  window.userAccessToken = FB.getAuthResponse()['accessToken'];
	}

	function initApp() {
	  getAccessTokenForUser();
	  processAllPages(inputData.items);
	}

	$.fn.fbNestedComments = function(pluginInputData) {
		inputData = pluginInputData;

		(function(d, s, id){
			var js, fjs = d.getElementsByTagName(s)[0];
			if (d.getElementById(id)) {return;}
			js = d.createElement(s); js.id = id;
			js.src = "//connect.facebook.net/en_US/sdk.js";
			fjs.parentNode.insertBefore(js, fjs);
		}(document, 'script', 'facebook-jssdk'));

		$('#fbLogin').on('click', function() {
			FB.login(function(response) {
				if (response.authResponse) {
					initApp();
				} else {
					console.log('User cancelled login or did not fully authorize.');
				}
			}, {scope: 'publish_actions'});
		});

		return this;
	};
}(jQuery, window));

