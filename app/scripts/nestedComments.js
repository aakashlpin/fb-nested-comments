(function($, window) {
	var inputData, userAccessToken, userId, userData, _this;
	var initialCommentsCount = 4;

	function frameRequest(req) {
	  return req;
	}

	function getLoginStatus(callback) {
		FB.getLoginStatus(function(response) {
			if(response.authResponse) {
				FB.api('/me/permissions', function(perms_response) {
					// if publish_actions access already exists, we're good to go
					if (_.find(perms_response.data, function(permissionItem) {
						return permissionItem.permission === "publish_actions";
					})) {
						console.log('permissions are already granted.');
						callback(true);
					} else {
						// publish_actions does not exist, so show an auth dialog
						// get publish_actions permissions
						console.log('requesting permission...');
						callback(false);
					}
				});
				// user is not connected to the app, so show an auth dialog
			} else {
				// get publish_actions permissions
				console.log('requesting permission...');
				callback(false);
			}
		});
	}

	function drawLoginDOM() {
        var dom =
        	'<div class="text-center" id="fbLoginContainer">'+
                '<button class="btn btn-primary" id="fbLogin">Connect with Facebook</button>'+
            '</div>';

		$(_this).html(dom);

		bindLoginEvents();
	}

	function bindLoginEvents() {
		$('#fbLogin').on('click', function() {
			FB.login(function(response) {
				if (response.authResponse) {
					initApp();
				} else {
					console.log('User cancelled login or did not fully authorize.');
				}
			}, {scope: 'publish_actions', auth_type: 'rerequest'});
		});
	}

	function fbInit() {
		FB.init({
			appId		: inputData.appId,
			xfbml		: true,
			version		: 'v2.0'
		});
		getLoginStatus(function(isGoodToGo) {
			if (isGoodToGo) {
				initApp();
			} else {
				drawLoginDOM();
			}
		});
	}

	window.fbAsyncInit = fbInit;

	function replyToComment(commentOnId, message, callback) {
		var apiAddress = "/"+ commentOnId +"/comments";
		FB.api(
			apiAddress,
			"POST",
			{
				"message": message
			},
			function(response) {
				if (response && !response.error) {
					callback(null, response.id);
				}
				callback(response.error || response);
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

	function getNestedCommentDOM(nestedComment, classes) {
		return '<li class="nestedComment '+ classes +'">' +
					'<div class="rowbox">' +
						'<div class="msgbox">'+
							'<a class="prof-img">'+
								'<img src="https://graph.facebook.com/' + nestedComment.from.id +'/picture" width="22" height="22">'+
							'</a>'+
							'<div class="side-content">'+
								'<div>'+
									'<a class="prof-link"><strong>'+ nestedComment.from.name +'</strong></a>'+
									'<span class="fb-comment-msg">'+ nestedComment.message +'</span>'+
								'</div>'+
							'</div>'+
						'</div>'+
					'</div>'+
				'</li>';
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
			var hasHiddenComments = pagePost.comments.data.length > initialCommentsCount;
			var hiddenCommentsCount = hasHiddenComments ? pagePost.comments.data.length - initialCommentsCount : 0;

			_.each(pagePost.comments.data, function(comment, index) {
				var visibilityClass = index >= initialCommentsCount ? 'hide' : '';
				domBody +=
					'<li class="'+ visibilityClass +'">' +
						'<div class="rowbox">'+
							'<div class="msgbox">'+
								'<a class="prof-img">'+
									'<img src="https://graph.facebook.com/'+ comment.from.id +'/picture" width="32" height="32">' +
								'</a>'+
								'<div class="side-content">'+
									'<div>'+
										'<a target="_blank" href="https://facebook.com/'+ comment.from.id +'" class="prof-link"><strong>'+ comment.from.name +'</strong></a>'+
										'<span class="fb-comment-msg">'+ comment.message +'</span>'+
									'</div>'+
									'<div class="fb-reply-btn-container">'+
										'<a data-action="do-reply">Reply</a>'+
									'</div>'+
								'</div>'+
							'</div>'+
						'</div>'+
					'</li>'
				;

				domBody +=
					'<li class="fb-replies-container">'+
						'<ul class="replies '+ visibilityClass +'">'
				;

				_.each(comment.comments, function(nestedComment, commentIndex, commentList) {
					var className = 'hide ';
					if (commentList.length-1 === commentIndex) {
						className += 'last';
					}
					domBody += getNestedCommentDOM(nestedComment, className);
				});

				if (comment.comments.length) {
					domBody +=
						'<li class="fb-reply-length-container">'+
							'<a data-action="show-replies" class="clearfix block">'+
								'<span class="reply-icon pull-left"></span>'+
								'<span class="pull-left">'+comment.comments.length +' Replies</span>'+
							'</a>'+
						'</li>'
					;
				}

				domBody +=
						'<li class="fb-reply-action-container hide">'+
							'<div class="reply-sec">'+
								'<a class="prof-img"> <img src="https://graph.facebook.com/' + userId +'/picture" width="22" height="22"> </a>'+
								'<div class="reply-input">'+
									'<textarea data-comment-id="'+comment.id+'" name="textarea" rows="1" placeholder="Write a reply..."></textarea>'+
								'</div>'+
							'</div>'+
						'</li>'+
						'</ul>'+
					'</li>'
				;
			});

			if (hasHiddenComments) {
				domBody +=
					'<li class="white-bg">'+
						'<a data-action="show-comments" class="clearfix block">'+
							'<span class="reply-icon pull-left"></span>'+
							'<span class="pull-left">View '+ hiddenCommentsCount +' more comments</span>'+
						'</a>'+
					'</li>'
				;
			}

			domBody += '</ul>';
		});

		var dom = domHead + domBody + domClose;
		//create the DOM
		$(_this).html(dom);

		//bind events in created DOM
		bindAllEvents();
	}

	function bindAllEvents() {
		$(_this).find('[data-action="show-replies"]').on('click', function() {
			$(this).closest('li').hide();
			$(this).closest('.replies').find('.nestedComment').removeClass('hide');
		});

		$(_this).find('[data-action="show-comments"]').on('click', function() {
			$(this).closest('li').hide();
			$(this).closest('.comments').find('>li.hide').removeClass('hide');
		});

		$(_this).find('[data-action="show-comments"]').on('click', function() {
			$(this).closest('li').hide();
			$(this).closest('.comments').find('>li.hide').removeClass('hide');
		});

		$(_this).find('[data-action="do-reply"]').on('click', function() {
			$(this).closest('.fb-reply-btn-container').hide();
			$(this).closest('li').next('li.fb-replies-container')
				.find('.replies').removeClass('hide')
				.end()
				.find('.replies > li.fb-reply-length-container').hide()
				.end()
				.find('.replies > li.hide').removeClass('hide')
				.end()
				.find('.replies > li.fb-reply-action-container textarea').focus()
				;
		});

		$(_this).find('li.fb-reply-action-container textarea').on('keypress', function(e) {
			if (e.which == 13) {
				//Enter keycode
				e.preventDefault();
				var textareaDOM = $(this);
				var text = $.trim(textareaDOM.val());
				if (!text.length) {
					return;
				}
				textareaDOM.attr('disabled', 'disabled');
				var commentId = textareaDOM.data('comment-id');
				replyToComment(commentId, text, function(err, responseCommentId) {
					if (err) {
						//TODO handle error
					} else {
						var commentDOM = getNestedCommentDOM({
							from: {
								name: userData.first_name + ' ' + userData.last_name,
								id: userId
							},
							message: text
						}, ' last ');

						textareaDOM.val('');
						textareaDOM.removeAttr('disabled');

						var lastNestedComment = textareaDOM.closest('.replies').find('>.nestedComment').last();
						if (lastNestedComment.length) {
							lastNestedComment.removeClass('last');
							lastNestedComment.after(commentDOM);
						} else {
							textareaDOM.closest('.replies').prepend(commentDOM);
						}
					}
				});
			}
		});
	}

	function getAccessTokenForUser() {
		var authResponse = FB.getAuthResponse();
		userAccessToken = authResponse['accessToken'];
		FB.api('/me', function(meResponse) {
			userData = meResponse;
		});
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

		if ($('#facebook-jssdk').length) {
			//facebook js sdk is already in place
			//directly init the app
			fbInit();

		} else {
			//load the sdk async and wait for fb to trigger the event
			(function(d, s, id){
				var js, fjs = d.getElementsByTagName(s)[0];
				if (d.getElementById(id)) {return;}
				js = d.createElement(s); js.id = id;
				js.src = "//connect.facebook.net/en_US/sdk.js";
				fjs.parentNode.insertBefore(js, fjs);
			}(document, 'script', 'facebook-jssdk'));
		}

		return this;
	};
}(jQuery, window));

