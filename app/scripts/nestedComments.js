(function($, window) {
	var inputData, userAccessToken, userId, _this;

	function frameRequest(req) {
	  return req + '?access_token=' + userAccessToken;
	}

	window.fbAsyncInit = function() {
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
			} else {
				$('#fbLogin').removeClass('hide');
			}
		});
	};

	function replyToComment() {
		FB.api(
			"/1448481268760001_1448481912093270/comments?access_token=" + userAccessToken,
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
		);
	}

	function processAllPosts(posts) {
		async.each(posts, processPost, function(err) {
			if (err) {
				console.log(err);
			}

			console.log(processedData);
			//this the place where we have all the data we need to create DOMs
			initDOM(_.values(processedData));
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

	function initDOM(items) {
		var domHead = '<div class="greybg">';
		var domClose = '</div>';
		var domBody = '';
		_.each(items, function(item) {
			domBody +=
				'<ul class="comments">' +
					'<li class="white-bg">' +
						'<strong>'+ item.page_name +'</strong>' +
					'</li>'
			;

			var pagePost = item.posts[0];

			_.each(pagePost.comments.data, function(comment, index) {
				var hideClass = index > 2 ? 'hide' : '';
				domBody +=
	                '<li class="'+ hideClass +'">' +
	                    '<div class="rowbox">'+
	                        '<div class="msgbox">'+
	                            '<a class="prof-img">'+
	                                '<img src="https://graph.facebook.com/'+ comment.from.id +'/picture" width="32" height="32">' +
	                            '</a>'+
	                            '<div class="side-content">'+
	                                '<div>'+
	                                    '<a target="_blank" href="https://facebook.com/'+ comment.from.id +'" class="prof-link"><strong>'+ comment.from.name +'</strong></a>'+
	                                    '<span>'+ comment.message +'</span>'+
	                                '</div>'+
	                                '<div>'+
	                                    '<a data-action="do-reply">Reply</a>'+
	                                '</div>'+
	                            '</div>'+
	                        '</div>'+
	                    '</div>'+
	                '</li>'
	            ;

	            if (comment.comments.length) {
	            	domBody +=
	            		'<ul class="replies '+hideClass+'">'
	            	;
	            }

	            _.each(comment.comments, function(nestedComment) {
                    domBody +=
                        '<li class="nestedComment hide">' +
                            '<div class="rowbox">' +
                                '<div class="msgbox">'+
                                    '<a class="prof-img">'+
                                        '<img src="https://graph.facebook.com/' + nestedComment.from.id +'/picture" width="22" height="22">'+
                                    '</a>'+
                                    '<div class="side-content">'+
                                        '<div>'+
                                            '<a class="prof-link"><strong>'+ nestedComment.from.name +'</strong></a>'+
                                            '<span>'+ nestedComment.message +'</span>'+
                                        '</div>'+
                                    '</div>'+
                                '</div>'+
                                '<div class="reply-sec hide">'+
	                                '<a class="prof-img"> <img src="https://graph.facebook.com/' + userId +'/picture" width="22" height="22"> </a>'+
	                                '<div class="reply-input">'+
	                                    '<textarea name="textarea" rows="1" placeholder="Write a reply..."></textarea>'+
	                                '</div>'+
	                            '</div>'+
                            '</div>'+
                        '</li>'
                    ;
	            });

	            if (comment.comments.length) {
					domBody +=
	                        '<li>'+
	                            '<a data-action="show-replies" class="clearfix block">'+
	                                '<img class="reply-icon pull-left">'+
	                                '<span class="pull-left">'+comment.comments.length +' Replies</span>'+
	                            '</a>'+
	                        '</li>'+
	                    '</ul>'
	                ;
	            }
			});

			domBody += '</ul>';
		});

		var dom = domHead + domBody + domClose;
		$(_this).html(dom);

		$(_this).find('[data-action="show-replies"]').on('click', function() {
			$(this).closest('li').hide();
			$(this).closest('.replies').find('.nestedComment').removeClass('hide');
		})
	}

	function getAccessTokenForUser() {
		var authResponse = FB.getAuthResponse();
    	userAccessToken = authResponse['accessToken'];
    	userId = authResponse['userID'];
	}

	function initApp() {
	  getAccessTokenForUser();
	  processAllPages(inputData.items);
	}

	$.fn.fbNestedComments = function(pluginInputData) {
		//assign the local variable with data sent from user
		inputData = pluginInputData;
		_this = this;

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

