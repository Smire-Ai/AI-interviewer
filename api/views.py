# api/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated  # Keep the import (we’re just commenting it out)
from .models import JobDescription, Interview, InterviewTurn, UserProfile
from .serializers import InterviewSerializer, JobDescriptionSerializer
from .gemini_service import generate_initial_question, generate_followup_question


# ✅ Public for debugging
class JobDescriptionListView(generics.ListAPIView):
    queryset = JobDescription.objects.all()
    serializer_class = JobDescriptionSerializer
    # permission_classes = [IsAuthenticated]  # DISABLED


class StartInterviewView(APIView):
    # permission_classes = [IsAuthenticated]  # DISABLED

    def post(self, request, *args, **kwargs):
        job_description_id = request.data.get('job_description_id')
        candidate_resume_text = request.data.get('resume_text')

        if not job_description_id or not candidate_resume_text:
            return Response(
                {"error": "job_description_id and resume_text are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            job = JobDescription.objects.get(id=job_description_id)
        except JobDescription.DoesNotExist:
            return Response(
                {"error": "JobDescription not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # ⚠️ Instead of request.user, just grab the first user in the DB
        user = UserProfile.objects.first()
        if not user:
            user = UserProfile.objects.create(uid="dummy_user", email="dummy@example.com", role="CANDIDATE")

        # Generate the first question
        first_question = generate_initial_question(
            job_title=job.title,
            job_description=job.description,
            candidate_resume_text=candidate_resume_text
        )

        # Create the interview and first turn
        interview = Interview.objects.create(candidate=user, job_description=job)
        InterviewTurn.objects.create(interview=interview, turn_number=1, question_text=first_question)

        serializer = InterviewSerializer(interview)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SubmitAnswerView(APIView):
    # permission_classes = [IsAuthenticated]  # DISABLED

    def post(self, request, interview_id, *args, **kwargs):
        answer_text = request.data.get('answer')
        if not answer_text:
            return Response({"error": "Answer text is required."}, status=status.HTTP_400_BAD_REQUEST)

        # ⚠️ Removed candidate=request.user
        try:
            interview = Interview.objects.get(id=interview_id)
            if interview.status == Interview.Status.COMPLETED:
                return Response({"error": "This interview is already completed."}, status=status.HTTP_400_BAD_REQUEST)

            last_turn = interview.turns.latest('turn_number')

        except Interview.DoesNotExist:
            return Response({"error": "Interview not found."}, status=status.HTTP_404_NOT_FOUND)
        except InterviewTurn.DoesNotExist:
            return Response({"error": "No question found to answer for this interview."}, status=status.HTTP_404_NOT_FOUND)

        # Build conversation history
        history = ""
        for turn in interview.turns.all().order_by('turn_number'):
            history += f"Interviewer: {turn.question_text}\n"
            if turn.candidate_answer:
                history += f"Candidate: {turn.candidate_answer}\n"

        feedback, next_question = generate_followup_question(
            job_title=interview.job_description.title,
            job_description=interview.job_description.description,
            conversation_history=history,
            candidate_answer=answer_text
        )

        last_turn.candidate_answer = answer_text
        last_turn.ai_feedback = feedback
        last_turn.save()

        new_turn = InterviewTurn.objects.create(
            interview=interview,
            turn_number=last_turn.turn_number + 1,
            question_text=next_question
        )

        return Response({
            "feedback": feedback,
            "next_question": next_question,
            "turn_number": new_turn.turn_number
        }, status=status.HTTP_201_CREATED)


class InterviewDetailView(generics.RetrieveAPIView):
    queryset = Interview.objects.all()
    serializer_class = InterviewSerializer
    # permission_classes = [IsAuthenticated]  # DISABLED
    lookup_field = 'id'

    # ⚠️ Commented out user filtering
    # def get_queryset(self):
    #     return Interview.objects.filter(candidate=self.request.user)
