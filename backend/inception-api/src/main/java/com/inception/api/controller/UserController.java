package com.inception.api.controller;

import com.inception.requests.dto.OrganizerResponse;
import com.inception.requests.dto.UserLookupResponse;
import com.inception.requests.service.OperationRequestService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.inception.auth.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final OperationRequestService requestService;

    public UserController(OperationRequestService requestService) {
        this.requestService = requestService;
    }

    @GetMapping("/organizers")
    public List<OrganizerResponse> listOrganizers() {
        return requestService.listOrganizers();
    }

    @GetMapping("/lookup")
    public UserLookupResponse lookupUser(
            @RequestParam String login,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return requestService.lookupUser(login, principal);
    }
}
