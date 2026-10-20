package com.inception.api.controller;

import com.inception.auth.security.UserPrincipal;
import com.inception.requests.dto.RejectRequestPayload;
import com.inception.requests.dto.RequestPayload;
import com.inception.requests.dto.RequestResponse;
import com.inception.requests.service.OperationRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/requests")
public class RequestController {

    private final OperationRequestService requestService;

    public RequestController(OperationRequestService requestService) {
        this.requestService = requestService;
    }

    @GetMapping
    public List<RequestResponse> list(@AuthenticationPrincipal UserPrincipal principal) {
        return requestService.list(principal);
    }

    @GetMapping("/{id}")
    public RequestResponse getById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return requestService.getById(id, principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RequestResponse create(
            @RequestBody RequestPayload payload,
            @RequestParam(defaultValue = "false") boolean submit,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return requestService.create(payload, principal, submit);
    }

    @PutMapping("/{id}")
    public RequestResponse update(
            @PathVariable Long id,
            @RequestBody RequestPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return requestService.update(id, payload, principal);
    }

    @PostMapping("/{id}/submit")
    public RequestResponse submit(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return requestService.submit(id, principal);
    }

    @PostMapping("/{id}/reject")
    public RequestResponse reject(
            @PathVariable Long id,
            @Valid @RequestBody RejectRequestPayload payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return requestService.reject(id, payload, principal);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        requestService.delete(id, principal);
    }
}
